# Deployment (GitHub Pages)

This project is set up to deploy the Angular frontend to GitHub Pages using GitHub Actions.

## One-time repo settings

1. Go to **Settings** → **Pages**.
2. Set **Source** to **GitHub Actions**.

## Deploy

Push to the `main` branch. The workflow builds the app and publishes it to GitHub Pages.

## Notes

- The build uses `--base-href /<repo-name>/` so the router works under the GitHub Pages subpath.
- A `404.html` fallback is included for client-side routing deep links.
- Update `src/environments/environment.prod.ts` with your backend URL before deploying.

## Backend

The backend (FastAPI) is not deployed by this workflow. Deploy it separately (Render, Railway, Fly.io, etc.) and update the frontend API base URL accordingly.
