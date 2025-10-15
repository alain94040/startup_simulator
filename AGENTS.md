# Repository Guidelines

## Project Structure & Module Organization
The repository lives flat in the root – no module system or build step is used.
```
├─ game.js            # Core game logic
├─ startup_game.html  # Main UI for playing the game
├─ tests.html         # Test harness and definitions
├─ styles.css         # UI styles
├─ game_summary.md    # High‑level walkthrough
├─ game_js_patch.txt  # Historical patches for the JS logic
└─ readme.md
```
All source lives in the repository root.

## Build, Test, and Development Commands
| Action | Command | What it does |
|--------|---------|--------------|
| Open UI | `open startup_game.html` | Launches the interactive game in the default browser |
| Run tests | `open tests.html` | Executes the bundled test harness and displays a pass/fail summary |
After editing `game.js` or `styles.css`, simply refresh the page.

## Coding Style & Naming Conventions
* 2‑space indentation, consistent semicolons.
* Classes: `PascalCase` (e.g., `StartupGame`).
* Functions / methods: `camelCase`.
* Constants: `UPPER_SNAKE_CASE` (rare in this repo).
* Strings: double quotes (`"`).
* Linting: run `eslint --env browser` if a linter is added.

## Testing Guidelines
The tests live in `tests.html` and use a simple harness providing `test(name, fn)` and `assert(cond, msg)`.
* Test names should be descriptive, e.g., *"Launch product before funding"*.
* Run tests by opening `tests.html` in a browser; results appear automatically.

## Commit & Pull Request Guidelines
* Commit messages: one‑line imperative, no emoji, e.g., `Add player score tracking`.
* PRs: include a brief description, link to an issue if applicable, and screenshots for visual changes.
* Checklist: tests pass, UI loads correctly, and lint passes (if a linter is in use).

## Security & Configuration Tips
* The game runs entirely in the browser; no server or external dependencies.
* Tests and the UI can be opened from any local file system without network access.
* If the repo is extended to include a backend, CI will need `npm install && npm test`.

