# Evalanche Website

This directory contains the standalone static site deployed to [evalanche.xyz](https://evalanche.xyz).

It is intentionally separate from the npm package:

- the npm package only publishes `dist/` and `skill/`
- this website is deployed through Vercel from the repo, but only publishes the static assets from `website/`
- changes here do not affect the package entrypoints or release tarball

Git-based deploys are orchestrated from the repo root:

- [vercel.json](/Users/jaack/Desktop/Github/evalanche/vercel.json) points Vercel at a dedicated static output directory
- [build-website.mjs](/Users/jaack/Desktop/Github/evalanche/scripts/build-website.mjs) copies the website assets into that output directory
- the npm package still only publishes `dist/` and `skill/`

## Files

- `index.html` — landing page
- `evalanche.css` — site styles
- `favicon.svg` — browser icon
- `social-card.svg` — social preview image
- `vercel.json` — static-site deploy settings

## Deploy

The `evalanche-xyz` Vercel project deploys from the repo root and uses `scripts/build-website.mjs` to emit `website-dist/` from the files in this directory.
