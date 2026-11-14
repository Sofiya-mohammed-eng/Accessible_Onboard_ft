import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

function amharicSpeechPlugin() {
  return {
    name: 'amharic-speech',
    configureServer(server: { middlewares: { use: (path: string, handler: (req: { url?: string }, res: { statusCode: number; setHeader: (name: string, value: string) => void; end: (body?: Buffer) => void }) => void) => void } }) {
      server.middlewares.use('/api/tts', async (req, res) => {
        try {
          const url = new URL(req.url || '', 'http://localhost');
          const text = (url.searchParams.get('text') || '').slice(0, 180);
          const lang = (url.searchParams.get('lang') || 'en').startsWith('am') ? 'am' : 'en';
          const remote = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${lang}&q=${encodeURIComponent(text)}`;
          const response = await fetch(remote, {
            headers: {
              'User-Agent': 'Mozilla/5.0',
              Referer: 'https://translate.google.com/',
            },
          });
          if (!response.ok || !text) {
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
