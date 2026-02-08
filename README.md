# Aqua Park - Water Slide Racing Game

A progressive web app (PWA) water slide racing game built with Three.js. Race down thrilling water slides, dodge obstacles, collect coins, and compete against AI rivals.

## Features

- **3D Water Slide Racing** - Procedurally generated slides with curves, ramps, and obstacles
- **4-Player Races** - Compete against 3 AI opponents with varying difficulty
- **20 Levels** - Progressive difficulty with longer slides, more obstacles, and smarter AI
- **Power-ups** - Speed boost, shield, magnet, and giant mode
- **Character Customization** - 12 unlockable character skins
- **Coin Economy** - Collect coins during races to unlock new skins
- **Installable PWA** - Install on your device from the browser, works offline
- **Local Storage Saves** - Progress, coins, and unlocks persist between sessions
- **Touch & Keyboard Controls** - Swipe/drag on mobile, arrow keys or A/D on desktop

## Controls

- **Mobile**: Swipe left/right or drag to steer
- **Desktop**: Arrow keys or A/D keys to steer

## How to Play

1. Tap **PLAY** to start racing at your current level
2. Steer left and right to avoid obstacles and collect coins
3. Bump opponents off the edges to eliminate them
4. Reach the finish line in 1st or 2nd place to unlock the next level
5. Earn coins to unlock new character skins in **CUSTOMIZE**

## Deployment (GitHub Pages)

1. Push this repository to GitHub
2. Go to Settings > Pages
3. Set source to the branch containing these files
4. The game will be available at `https://<username>.github.io/Aqua-Park-Take-2/`

## Tech Stack

- **Three.js** (r128) - 3D rendering
- **Web Audio API** - Procedural sound effects
- **Service Worker** - Offline caching
- **Web App Manifest** - PWA installability
- **LocalStorage** - Save data persistence