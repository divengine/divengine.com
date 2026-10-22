# divengine.com

The website of [Divengine Studio](https://github.com/divengine/studio): an open source,
self-hosted platform for engineering context, built on Drupal. Studio keeps requirements,
decisions, models, process, tests, evidence, code and database schemas as connected, versioned
and traceable records.

A static, multi-page site: plain HTML and CSS, a few lines of JavaScript, no framework. The
generated pages are committed and served as they are (custom domain in `CNAME`).

## Positioning

The copy keeps three concepts apart:

- **Engineering context**: the structured, persistent, scoped and version-aware knowledge about
  an engineered solution and its relationships.
- **Explicit Software Engineering Method (ESEM)**: an independent, process-orthogonal method
  (<https://github.com/rafageist/explicit-software-engineering-method>). Studio does not require
  it and it does not require Studio.
- **Divengine Studio**: the platform that organizes artifacts, traceability, history and access.

Capabilities that are not in Studio's main branch are labelled *Planned* and link to their Studio
issues. Feature claims are checked against the Studio code and README, not against open issues.

## Pages

| Path | Source | About |
|---|---|---|
| `/` | `_build/pages/index.html` | The problem, the three concepts, a traced change walkthrough, modules, roadmap summary, FAQ |
| `/product/` | `product.html` | Developments, engineering records, typed traceability, revisions and baselines, discussions, roles |
| `/knowledge/` | `knowledge.html` | Requirements, decisions, risks, evidence, BPMN and UML modelers, planned Modeling Foundation, knowledge base |
| `/process/` | `process.html` | The Unified Process as one supported process: phases, development cases, readiness, change requests, baselines |
| `/quality/` | `quality.html` | Validation and evidence: test management, frozen runs, QA issues, verification |
| `/code-and-data/` | `code-and-data.html` | Code Source, code documentation, database schemas, optional read-only MCP |
| `/work/` | `work.html` | Coordination (projects, boards, timesheets) and how it differs from engineering accountability |
| `/get-studio/` | `get-studio.html` | Requirements, web installer, base recipe for existing Drupal sites, MCP setup, updating existing sites |
| `/about/` | `about.html` | Vision, engineering context and ESEM, principles, roadmap, contributing |

## Editing

1. Edit a fragment in `_build/pages/`. Its first line is a JSON comment with the page metadata
   (path, title, description, navigation, Open Graph image, FAQ).
2. Rebuild: `python3 _build/build.py` (Python 3, no dependencies). It writes the pages, adds the
   shared header, footer and SEO tags (canonical, Open Graph, Twitter, JSON-LD) and regenerates
   `sitemap.xml`.
3. Preview: `python3 -m http.server 8000` and open http://localhost:8000.

Shortcuts inside a page: `{{shot:name|alt text}}` (a framed screenshot from
`assets/img/screens/name.jpg`; `shot!:` loads it eagerly, `dark:` gives a dark frame),
`{{icon:name}}` (an icon from `ICONS` in `build.py`), `{{repo}}`, `{{docs}}`.

Screenshots come from a Studio site with invented demo data. The Open Graph cards in
`assets/og/` and `apple-touch-icon.png` are rendered from `_build/og.html` with Playwright:
`node _build/og.js`.

## License

Content © Divengine Software Solutions. Divengine Studio itself is free software under the GNU GPL v3.
