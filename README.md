# Cloe Math

A small Italian multiplication and division practice app designed for a tablet.

## Features
- Ten-question practice rounds with multiplication and inverse division.
- Numeric answer input and optional browser speech recognition (Italian).
- Incorrect operations receive higher repetition weight in future rounds.
- Daily accuracy, streak, points, recent answers and average response time.
- Progress stored locally in the browser using LocalStorage.
- Basic offline support and installable PWA manifest.

## Run locally
Open `index.html` in a modern browser. For service worker/PWA features, serve the folder over HTTPS or localhost.

## GitHub Pages
In the repository, open **Settings → Pages** and select **Deploy from a branch**, branch **main**, folder **/ (root)**, then Save. The site will be published at:
https://zemaree.github.io/cloe-math/

Speech recognition depends on browser support and microphone permission. Numeric input is always available.

No student data is sent to a server; progress remains in the browser on the device where it was recorded.