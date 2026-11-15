import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import {spawn} from 'node:child_process';
import {existsSync} from 'node:fs';
import path from 'path';
import {defineConfig} from 'vite';

const ttsCache = new Map<string, Buffer>();

function gttsPython(): string {
  const local = path.resolve(__dirname, '.venv/bin/python');
  return existsSync(local) ? local : 'python3';
}

function speakWithGtts(text: string, lang: string, slow: boolean): Promise<Buffer> {
  const key = `${lang}\n${slow ? 'slow' : 'normal'}\n${text}`;
  const cached = ttsCache.get(key);
  if (cached) return Promise.resolve(cached);
  const script = path.resolve(__dirname, 'scripts/gtts_speak.py');
  return new Promise((resolve, reject) => {
    const child = spawn(gttsPython(), [script, lang, slow ? '1' : '0'], {stdio: ['pipe', 'pipe', 'pipe']});
    const out: Buffer[] = [];
    const err: Buffer[] = [];
    const timer = setTimeout(() => child.kill('SIGKILL'), 20000);
    child.stdout.on('data', (chunk: Buffer) => out.push(chunk));
    child.stderr.on('data', (chunk: Buffer) => err.push(chunk));
    child.on('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        reject(new Error(Buffer.concat(err).toString('utf8') || `gTTS exited ${code}`));
        return;
      }
      const audio = Buffer.concat(out);
      if (audio.length < 64) {
        reject(new Error('gTTS returned empty audio'));
        return;
      }
      ttsCache.set(key, audio);
      if (ttsCache.size > 60) {
        const oldest = ttsCache.keys().next().value;
        if (oldest) ttsCache.delete(oldest);
      }
      resolve(audio);
    });
    child.stdin.write(text, 'utf8');
    child.stdin.end();
  });
}

function amharicSpeechPlugin() {
  return {
    name: 'amharic-speech',
    configureServer(server: { middlewares: { use: (path: string, handler: (req: { url?: string }, res: { statusCode: number; setHeader: (name: string, value: string) => void; end: (body?: Buffer) => void }) => void) => void } }) {
      server.middlewares.use('/api/tts', async (req, res) => {
        try {
          const url = new URL(req.url || '', 'http://localhost');
          const text = (url.searchParams.get('text') || '').slice(0, 400);
          const lang = (url.searchParams.get('lang') || 'en').startsWith('am') ? 'am' : 'en';
          if (!text) {
            res.statusCode = 400;
            res.end();
            return;
          }
          if (lang === 'am') {
            try {
              const audio = await speakWithGtts(text, 'am', true);
              res.setHeader('Content-Type', 'audio/mpeg');
              res.setHeader('Cache-Control', 'no-store');
              res.end(audio);
              return;
            } catch {
              // The library could not speak this line, so try the direct voice next.
            }
          }
          const remote = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${lang}&q=${encodeURIComponent(text.slice(0, 180))}`;
          const response = await fetch(remote, {
            headers: {
              'User-Agent': 'Mozilla/5.0',
              Referer: 'https://translate.google.com/',
            },
          });
          if (!response.ok) {
            res.statusCode = 502;
            res.end();
            return;
          }
          res.setHeader('Content-Type', 'audio/mpeg');
          res.setHeader('Cache-Control', 'no-store');
          res.end(Buffer.from(await response.arrayBuffer()));
        } catch {
          res.statusCode = 500;
          res.end();
        }
      });

      server.middlewares.use('/api/stt', async (req, res) => {
        const incoming = req as {
          method?: string;
          url?: string;
          [Symbol.asyncIterator]?: () => AsyncIterator<Uint8Array>;
        };
        try {
          if (incoming.method !== 'POST') {
            res.statusCode = 405;
            res.end();
            return;
          }
          const parts: Buffer[] = [];
          if (incoming[Symbol.asyncIterator]) {
            for await (const chunk of incoming as AsyncIterable<Uint8Array>) parts.push(Buffer.from(chunk));
          }
          const audio = Buffer.concat(parts);
          const url = new URL(incoming.url || '', 'http://localhost');
          const lang = (url.searchParams.get('lang') || 'am-ET').toLowerCase().startsWith('am') ? 'am-ET' : 'en-US';
          const remote = `https://www.google.com/speech-api/v2/recognize?output=json&lang=${lang}&client=chromium&key=AIzaSyBOti4mM-6x9WDnZIjIeyEU21OpBXqWBgw`;
          const response = await fetch(remote, {
            method: 'POST',
            headers: {
              'Content-Type': 'audio/l16; rate=16000',
              'User-Agent': 'Mozilla/5.0',
            },
            body: audio,
          });
          const raw = await response.text();
          let transcript = '';
          for (const line of raw.split('\n')) {
            if (!line.trim()) continue;
            try {
              const parsed = JSON.parse(line) as {
                result?: Array<{ alternative?: Array<{ transcript?: string }> }>;
              };
              const heard = parsed.result?.[0]?.alternative?.[0]?.transcript || '';
              if (heard) transcript = heard;
            } catch {
              // Ignore a non-JSON status line.
            }
          }
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Cache-Control', 'no-store');
          res.end(Buffer.from(JSON.stringify({ transcript })));
        } catch {
          res.statusCode = 500;
          res.end(Buffer.from(JSON.stringify({ transcript: '' })));
        }
      });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), amharicSpeechPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
