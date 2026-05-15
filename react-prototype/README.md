# Masters of Life — React Prototype

**This is an experimental prototype. It does not replace the vanilla app.**

The vanilla app (`index.html`, `js/app*.js`, `css/styles.css`) is unchanged.
This folder explores what the Today Page could look like in React + TypeScript.

## What this is

- A React + TypeScript + Vite prototype of the Today Page
- Uses mock/local state only — no Firebase, no auth, no real persistence
- Explores component architecture, interactions, and visual design
- Not production code

## What this is not

- Not a migration of the vanilla app
- Not connected to Firebase or any backend
- Not feature-complete (analytics, meals, finance, body tracking omitted)

## How to run

Requires Node.js (https://nodejs.org, LTS recommended).

```bash
cd react-prototype
npm install
npm run dev
```

Then open http://localhost:5173

## Build

```bash
npm run build
```

Output goes to `react-prototype/dist/`.

## Stack

- React 18
- TypeScript 5
- Vite 5
- No additional runtime dependencies
