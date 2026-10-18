# divengine.com

The website of [Divengine Studio](https://github.com/divengine/studio): an open source,
self-hosted software engineering workspace built on Drupal.

A static, multi-page site: plain HTML and CSS, a few lines of JavaScript, no framework. The
generated pages are committed and served as they are (custom domain in `CNAME`).

## Pages

| Path | Source | About |
|---|---|---|
| `/` | `_build/pages/index.html` | Home: what Studio is, highlights, FAQ |
| `/product/` | `product.html` | Developments, explicit records, discussions, roles |
| `/process/` | `process.html` | The Unified Process: phases, readiness, change requests, baselines |
| `/knowledge/` | `knowledge.html` | Requirements, BPMN, UML, knowledge base, traceability |
| `/quality/` | `quality.html` | Test management |
| `/work/` | `work.html` | Projects, Kanban boards, timesheets |
| `/code-and-data/` | `code-and-data.html` | Code Source, technical code documentation, database schemas, MCP for AI agents |
| `/get-studio/` | `get-studio.html` | Requirements and installation |
| `/about/` | `about.html` | Vision, principles, roadmap, contributing |

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
