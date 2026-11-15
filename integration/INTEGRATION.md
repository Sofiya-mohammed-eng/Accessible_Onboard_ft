# Integrating the Accessible Onboarding module

## Level 1: one script tag

Add this where you want the module to appear:

    <div id="alx-onboarding"></div>
    <script src="https://savanna-website.vercel.app/assets/js/onboarding.js"
            data-api="https://savanna-accessible-onboarding-chi.vercel.app" defer></script>

- `data-api`: address of the API that provides read-aloud and voice input.
- Without the `<div>`, the module attaches to the end of the page.
- To run your own copy, copy `assets/js/onboarding.js` to your server and change `src`. Run the API from `login-api/` (see the main README) and change `data-api`.

## Where to paste it

- **Plain HTML or any CMS:** into the page or template HTML.
- **WordPress:** a Custom HTML block, or the theme footer.
- **A learning platform:** anywhere that accepts custom HTML or a script tag (for example an "additional HTML" setting or an HTML block).
- **React or Next.js:** render `<div id="alx-onboarding" />`, then load the script once:

        useEffect(() => {
          const s = document.createElement('script');
          s.src = 'https://savanna-website.vercel.app/assets/js/onboarding.js';
          s.dataset.api = 'https://savanna-accessible-onboarding-chi.vercel.app';
          document.body.appendChild(s);
        }, []);

## Level 2: REST API

- Interactive documentation: https://savanna-accessible-onboarding-chi.vercel.app/docs
- OpenAPI specification: https://savanna-accessible-onboarding-chi.vercel.app/openapi.json
- Routes: `GET /api/tts`, `POST /api/stt`, `GET /health`

## Requirements and limits

- The host page must be served over HTTPS for the microphone to work.
- If the host uses a Content Security Policy, allow the script address and the API address.
- The module's styles are global and may affect the host page. Test on your own pages. Isolating the styles in a Shadow DOM is future work.
- Level 3 open standards (LTI 1.3, Open Badges) are not implemented.
