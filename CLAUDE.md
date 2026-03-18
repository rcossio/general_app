# Claude Instructions

## Privacy — Hard Rules

Never include real deployment information in any tracked file. Always use placeholders.

| Instead of | Use |
|---|---|
| Real domain names | `yourdomain.com` |
| Real server IPs | `your-server-ip` |
| Real usernames / GitHub handles | `yourusername` |
| Real emails | `you@example.com` |
| Real passwords or secrets | `your-strong-password` |

This applies to all files that are or could be git-tracked: `.md`, `.conf`, `.sh`, `.ts`, `.js`, `.json`, `.yaml`, and any other config or doc file.

The only place real values belong is `.env`, which is gitignored.

## Before Starting Any Task

Read all `.md` files in the project root before doing anything. This includes — but is not limited to — `SPEC.md`, `DEPLOYMENT.md`, and `README.md`. These files define the intended architecture, conventions, and constraints. Code must conform to them, not to whatever pattern already exists in the codebase (existing code may already be wrong).

Scan the project structure first. Check what already exists before creating anything new — test folders, config files, scripts, docs. Do not create a file if one already serves the same purpose.

## Testing

Tests live in `__tests__/`. Always check there first. Run `npm test` before writing anything new. Extend existing tests — never create parallel scripts or separate test files outside `__tests__/`.

## Bash Commands

You are allowed to freely use `cat`, `grep`, `ls`, `sed -n`, `find`, and `awk` without asking for permission.

