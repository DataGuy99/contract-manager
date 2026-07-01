# Contractor Manager v3
Live app: https://dataguy99.github.io/contract-manager/
Source: `app/` (see `app/SPEC.md` for full feature spec + handoff). Local-first (IndexedDB), no backend.
Deployed build is committed at repo root (Pages legacy branch mode). To redeploy after edits:
`cd app && npm install && GH_PAGES=1 npm run build && cp -r dist/* ../` then commit & push.
