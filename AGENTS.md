# Agent notes

## Running things

Use the package.json scripts, never invoke `tsc` / `vitest` / `node build/index.js` directly:

- `yarn build` — compile TypeScript to `build/`
- `yarn lint`
- `yarn typecheck`

