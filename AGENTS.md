# Repository Guidelines

This document captures the key conventions and tooling that the startup‑simulator repository follows.  Keep it handy when you fork, clone, or contribute.

## Project Structure & Module Organization

```
├─ game.js            # Core game logic
├─ startup_game.html  # Main UI for playing the game
├─ tests.html         # Simple JavaScript test runner
├─ styles.css         # UI styles
├─ game_summary.md    # High‑level walkthrough of the game
├─ game_js_patch.txt  # Historical patches for the JS logic
└─ readme.md
```

* All source is plain **JavaScript**; no build step is required.  The browser executes the code directly.
* Test logic lives in `tests.html`.  It uses a tiny inline test harness; no external frameworks.

## Running the Game Locally

```bash
# Open the main page in your browser
open startup_game.html
```

**Tips**
* In development you can keep `startup_game.html`, `game.js`, and `styles.css` in sync by reloading the page after each change.
* For automated testing you open `tests.html`; the page will populate a summary area with the results.

## Build, Test, and Development Commands

The repository does not ship a build system – the code runs natively in the browser.  Consequently:

| Action | Command | What it does |
|--------|---------|--------------|
| Open UI | `open startup_game.html` | Launches the interactive game in the default browser |
| Run tests | `open tests.html` | Executes the bundled test harness and displays a pass/fail summary |

There is intentionally **no** `npm` or `yarn` dependency; the repo is lightweight and browser‑only.

## Coding Style & Naming Conventions

* **Indentation:** 2 spaces.
* **Semicolons:** Optional but consistent where used.  Most files terminate statements with `;`.
* **Naming:**
  * Classes – `PascalCase` (e.g., `StartupGame`).
  * Functions / methods – `camelCase`.
  * Constants – `UPPER_SNAKE_CASE` (rarely used here, but follow the pattern if added).
* **String literals:** Prefer double quotes (`"`) for consistency.
* **File layout:** Keep related logic in the same file; no module system is used.

Linting is not enforced by the repo, but any new code should pass basic `eslint --env browser` checks manually if you add a linter.

## Testing Guidelines

The repository ships a tiny test harness in **tests.html**.  Tests are written declaratively:

```js
test("<test name>", () => {
  const game = new StartupGame();
  // …assertions using `assert(condition, message)`
});
```

* **Test name** should be descriptive (e.g., "Full‑time founder with $0 eventually runs out of money").
* **Assertions:** Use the provided `assert` function; it throws a message on failure.
* **Running tests:** Open `tests.html` in a browser.  The page will automatically execute all declared tests and display a summary.

All public tests are located in `tests.html`; unit tests for internal helper functions are included there as well.

## Commit & Pull Request Guidelines

* **Commit messages:** One‑line imperative summary, no emoji.
  *Example:* `Removed emoji to make patches easier to apply`.
* **Pull requests:** Include a short description, link to the issue or design doc if any, and screenshots of the UI if the change is visual.
* **Reviews:** Verify that tests pass (open `tests.html`) and that the UI loads correctly.

## Security & Configuration Tips

* The game runs entirely in the client; no server or backend is involved.
* `tests.html` contains a naive test runner that does not rely on external services, so it can be safely opened from a local file system.
* If you extend the repo to include a backend, the CI will need to run `npm install && npm test`.

---

These guidelines keep the project lightweight and easy to contribute to. Happy hacking!

