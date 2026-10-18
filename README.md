# Levy Juma Masinde — Portfolio

A responsive personal portfolio for showcasing my background, leadership experience, projects, learning interests, certificates, and contact links.

## Preview locally

This is a static website and does not require a build step. Open `index.html` in a browser, or start a local web server from this folder:

```bash
python -m http.server 8000
```

Then visit `http://localhost:8000`.

## Built with

- HTML
- CSS
- JavaScript

## Project structure

```text
.
├── assets/
│   ├── certificates/
│   ├── Levy-Juma-Masinde-Resume.pdf
│   └── levy-profile.jpe
├── index.html
├── script.js
└── styles.css
```

## Features

- Responsive layouts for desktop and mobile
- Mobile navigation menu
- Sections for about, experience, interests, projects, certificates, and contact
- Public Coursera course certificate and Google AI badge PDF, each listed separately, with Credly badge verification
- Downloadable résumé and links to social profiles
- Passcode-gated access to the privately stored first-year result slip

## Protected result slip

The result slip must stay out of this public repository. It is stored in the private
`private-documents` Supabase Storage bucket. The portfolio asks for a passcode and calls the
`authorize-result-slip` Edge Function, which returns a signed URL that expires after one minute.
Authorized recipients can still save or capture the document after opening it.

The Edge Function requires the `RESULT_SLIP_ACCESS_CODE` secret in Supabase Edge Function
secrets. Set it only in the Supabase dashboard; never commit it to this repository or share it
in chat. Use a unique, randomly generated 32–128 character URL-safe passcode. The function also
needs the project’s default server-only Supabase secret key, which Supabase injects into Edge
Functions. The function is public at the gateway (`verify_jwt = false`) because the shared
passcode is checked by the function itself; it issues signed URLs only for the fixed result-slip
object.

The browser-side publishable key in `script.js` is intentionally public and is not a storage
credential. The storage bucket remains private.

## Deployment

This site can be published with GitHub Pages from the repository's `main` branch and root folder. After enabling Pages in the repository settings, GitHub will provide the public website URL.
