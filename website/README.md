# Evalanche Website

This directory contains the standalone static site deployed to [evalanche.xyz](https://evalanche.xyz).

It is intentionally separate from the npm package:

- the npm package only publishes `dist/` and `skill/`
- this website is deployed through Vercel from `website/`
- changes here do not affect the package entrypoints or release tarball

## Files

- `index.html` — landing page
- `evalanche.css` — site styles
- `favicon.svg` — browser icon
- `social-card.svg` — social preview image
- `vercel.json` — static-site deploy settings

## Deploy

Deploy this directory as the root of the `evalanche-xyz` Vercel project.
