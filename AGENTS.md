# Project Guidelines & Rules

## Permanent Database & Git Safety Rules
These rules apply to every session and every task in this project, including local development, scripts, deployment, and delegated work.

1. **NEVER delete the live database**, drop it, truncate its tables, or run destructive database resets against it (including `migrate:fresh`, `migrate:refresh`, and `db:wipe`).
2. **NEVER connect to or interact with the live database while working on localhost.** This includes direct database connections and indirect access through live APIs, application commands, migrations, background jobs, and scripts. Use an explicitly verified local or isolated development database. If the database target is unknown, stop and ask the user before accessing it; never assume it is safe.
3. **NEVER force-push.** Do not use `git push -f`, `--force`, `--force-with-lease`, forced refspecs (such as `+main`), or equivalent mechanisms. Resolve rejected pushes without rewriting remote history.

Before running deployment or maintenance scripts, read them for database operations and force-push commands. A request to push or deploy does not override these rules. For frontend-only changes, deploy only the frontend and do not run live database migrations or backend database commands.

## Core Testing Rule: Do Not Run Browser/Automated Tests - Let the User Test
- **NEVER** launch browser subagents, headless browsers, or automated UI testing sessions to verify changes.
- **ALWAYS** let the USER perform all testing and validation themselves.
- Once implementation or changes are complete, present the summary of changes and let the user test directly.
