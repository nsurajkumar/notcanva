# notcanva

A free, open-source, Windows XP–inspired design editor that runs entirely in the browser.
No accounts, no backend: designs live in the user's IndexedDB.

## Stack

- **Astro** (static output): `/` and `/404` are pure HTML+CSS with zero JavaScript.
- **React island** for `/app` (`client:only="react"`): Konva canvas, zustand store, Dexie (IndexedDB).
- Tailwind CSS v4 for the landing page; hand-written `xp.css` scoped under `.xp-desktop` for the editor.

## Commands

```sh
npm install
npm run dev      # http://localhost:4321
npm test         # vitest (editor store logic)
npm run build    # type-check + static build into dist/
npm run preview  # serve dist/
```

`dist/` can be deployed to any static host (Cloudflare Pages, Netlify, GitHub Pages, Vercel).

## Layout

```
src/pages/          index.astro (landing), app.astro (editor island), 404.astro
src/layouts/        Base.astro (head/meta)
src/components/     landing/ (Astro), desktop/ + editor/ (React)
src/lib/            editor store/types/actions, db (Dexie), export, backup, templates
test/               vitest unit tests
```
