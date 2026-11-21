# Staging

Test copies of the live apps. Same Firebase and Stripe as production, so use your own account and do not complete real checkouts.

- Scorekeeper: /scorekeeper-app/staging/
- Basepath: /scorekeeper-app/staging/basepath.html

Workflow: put new builds here, log in and click through the real screens, then copy index.html and basepath.html to the repo root in ONE commit (never delete then upload).
Push notifications do not work in staging (the service worker lives at the repo root).
