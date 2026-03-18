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

