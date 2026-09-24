# Paseo Workflow Starter Guide

Small static website that teaches a new developer how to start using `paseo-workflow`.

- Only HTML, CSS, vanilla JavaScript. No build, no dependencies.
- Files: `index.html`, `styles.css`, `app.js`
- Open locally: `python3 -m http.server 8000` then visit http://localhost:8000
- Source of truth: https://github.com/khoawatt/paseo-workflow (README, AGENTS.md, docs/SETUP.md, docs/CONFIGURATION.md, docs/VALIDATION.md, docs/TROUBLESHOOTING.md, docs/OPENCODE_COMPATIBILITY.md, Bootstrap V1 spec)
- Upstream bootstrap is shipped/implemented (`install.sh`, `verify.sh`, `tests/test.sh`, `install-project.sh`). This guide documents that shipped flow; this guide itself is not operational validation.
- Full validation gate: Preflight + smoke A–G, bootstrap regression suite (`bash tests/test.sh`), live idempotency, and secret-safety checks — all passing with observable evidence.
