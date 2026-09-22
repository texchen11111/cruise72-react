# Project requirements

- All subsequent interface and interaction changes must use the React framework. Maintain React components in `src/components`, application state in `src/store.js`, and the entry point in `src/main.jsx`.
- Do not revert to document-level innerHTML templates or a React wrapper around the old application. React owns the UI; the isolated Three.js renderer owns only its canvas.
- Preserve the existing appearance and interaction rules unless explicitly requested. Retain the vendored Three.js 0.170.0 renderer and existing material/camera values when possible.
- `src/model.js` is the authoritative 48 mm grid model. Keep sizes, grid snapping, presets, collision rules, and exported configuration semantics consistent.
- Use `npm ci`, `npm test`, and `npm run build`. `dist/` is generated deployment output; edit source, never patch the generated bundle.
- Preserve this Site's `.openai/hosting.json` project ID and access configuration. Do not create a replacement Site or change the original workers.dev project.
