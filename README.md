# Accessible Onboarding for Savanna (Track 1)

A drop-in sign-up and sign-in module. Learners choose English or Amharic, and can have every page read aloud and answer by voice.

## Live demo

- Website: https://savanna-website.vercel.app/pages/login-test.html
- API documentation: https://savanna-accessible-onboarding-chi.vercel.app/docs

## Install on a page (Level 1: one script tag)

1. Copy `assets/js/onboarding.js` into your site.
2. Add one line to any page:

        <script src="assets/js/onboarding.js" data-api="http://localhost:8000" defer></script>

3. Start the API (next section). Without it the page still loads, but read-aloud and voice input will not work.

## Run everything with Docker Compose

Needs Docker.

        docker compose up --build

- Website: http://localhost:8080/pages/login-local.html
- API documentation: http://localhost:8000/docs

Stop with Ctrl + C.

## Run the API without Docker (Level 2: REST + OpenAPI)

Needs Python 3.

        cd login-api
        python3 -m venv .venv
        source .venv/bin/activate
        pip install -r requirements.txt
        uvicorn main:app --port 8000

- API documentation: http://localhost:8000/docs
- OpenAPI specification: http://localhost:8000/openapi.json
- Health check: http://localhost:8000/health

Endpoints: `GET /api/tts` (read aloud), `POST /api/stt` (voice input), `GET /health`.

## Rebuild the script

Needs Node.js.

        cd login-app
        npm install
        npx vite build --config vite.embed.config.ts

The result is written to `assets/js/onboarding.js`.

## Settings

- `SPEECH_API_KEY` (optional): key for the voice-input route. Set it before starting the API. Never commit it.

## Known limitations

- Read-aloud sends the text to be spoken to an online speech service. A consent step is not built yet.
- The API has no user database. Sign-in is a front-end demo.
- The WCAG 2.2 AA conformance report is added separately.

The original Savanna static pages README is kept as README-savanna.md.
