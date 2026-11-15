import json
import os

import httpx
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response

app = FastAPI(title="Accessible Onboarding API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/api/tts")
async def tts(text: str = "", lang: str = "en"):
    text = text[:180]
    if not text:
        return Response(status_code=400)
    tl = "am" if lang.startswith("am") else "en"
    async with httpx.AsyncClient(timeout=15) as client:
        r = await client.get(
            "https://translate.google.com/translate_tts",
            params={"ie": "UTF-8", "client": "tw-ob", "tl": tl, "q": text},
            headers={
                "User-Agent": "Mozilla/5.0",
                "Referer": "https://translate.google.com/",
            },
        )
    if r.status_code != 200:
        return Response(status_code=502)
    return Response(
        content=r.content,
        media_type="audio/mpeg",
        headers={"Cache-Control": "no-store"},
    )


@app.post("/api/stt")
async def stt(request: Request, lang: str = "am-ET"):
    key = os.getenv("SPEECH_API_KEY", "")
    if not key:
        return JSONResponse({"transcript": ""})
    audio = await request.body()
    code = "am-ET" if lang.lower().startswith("am") else "en-US"
    async with httpx.AsyncClient(timeout=20) as client:
        r = await client.post(
            "https://www.google.com/speech-api/v2/recognize",
            params={"output": "json", "lang": code, "client": "chromium", "key": key},
            headers={
                "Content-Type": "audio/l16; rate=16000",
                "User-Agent": "Mozilla/5.0",
            },
            content=audio,
        )
    transcript = ""
    for line in r.text.splitlines():
        if not line.strip():
            continue
        try:
            data = json.loads(line)
            heard = data["result"][0]["alternative"][0]["transcript"]
            if heard:
                transcript = heard
        except (KeyError, IndexError, ValueError):
            pass
    return {"transcript": transcript}
