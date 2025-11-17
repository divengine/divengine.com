# GitHub Organisation Snapshot

Script path: `fetch_org_snapshot.py`

## Requirements

- Python 3.9+
- `requests` library (`pip install requests`)
- Optional: `GITHUB_TOKEN` environment variable or `--token` argument (recommended to avoid rate limits)

## Usage

```bash
python fetch_org_snapshot.py divengine \
  --output data/divengine.org.json \
  --max-repos 75
```

- Replace `divengine` with any GitHub organisation login.
- Use `--output` to control the JSON destination. Non-existing folders must be created beforehand.
- Add `--token <personal-access-token>` for higher rate limits. A classic PAT with `public_repo` scope is enough.
- `--max-repos` (default `50`) limits how many repositories are captured to keep payload size manageable.

## Output Structure

The resulting JSON contains three top-level keys:

1. `organization`: Public profile metadata (name, description, social links, counts, avatar).
2. `repositories`: Array of highlighted repos sorted by stars with languages, topics, contributors, activity timestamps, and default branch info.
3. `stats`: Aggregated totals (stars, forks, languages breakdown) to power hero metrics on the static landing page.

Each repository entry also includes the top 5 contributors (login, profile URL, contribution count) and per-language byte usage for quick charts.

## Tips

- Snapshot files can be checked into the repo for deterministic builds or regenerated in CI before publishing.
- Run the script periodically (e.g., scheduled GitHub Action) to keep the landing page content fresh.
- When building the static site, consume the JSON directly in `script.js` or pre-render the HTML using your preferred templating tool.
