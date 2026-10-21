#!/usr/bin/env python3
"""Builds the static site from _build/pages into the repository root.

Each page is an HTML fragment whose first line is a JSON comment with its metadata:
<!--{"path": "/process/", "title": "…", "description": "…", "nav": "process"}-->

The layout adds the head (SEO, Open Graph, JSON-LD), the header and the footer, and expands
{{shot:name|alt text}} (a framed screenshot) and {{icon:name}} (an inline SVG icon). It also writes
sitemap.xml. Run it after editing a page:  python3 _build/build.py
Plain Python 3, no dependencies. The generated files are committed: the host serves them as they are.
"""
import html
import json
import pathlib
import re
import struct

ROOT = pathlib.Path(__file__).resolve().parent.parent
PAGES = ROOT / "_build" / "pages"
SITE = "https://divengine.com"
REPO = "https://github.com/divengine/studio"
DOCS = "https://github.com/divengine/studio/wiki"
LASTMOD = "2026-10-21"

NAV = [
    ("product", "/product/", "Product"),
    ("knowledge", "/knowledge/", "Knowledge"),
    ("process", "/process/", "Process"),
    ("quality", "/quality/", "Quality"),
    ("code-and-data", "/code-and-data/", "Code & data"),
    ("work", "/work/", "Work"),
    ("about", "/about/", "About"),
]

ICONS = {
    "layers": '<path d="M12 3 2 8l10 5 10-5-10-5Z"/><path d="m2 16 10 5 10-5"/><path d="m2 12 10 5 10-5"/>',
    "flow": '<circle cx="5" cy="6" r="2.5"/><circle cx="19" cy="6" r="2.5"/><circle cx="12" cy="18" r="2.5"/><path d="M7.5 6h9M6.5 8l4.3 7.6M17.5 8l-4.3 7.6"/>',
    "link": '<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>',
    "check": '<path d="M9 11l3 3 8-8"/><path d="M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9"/>',
    "board": '<rect x="3" y="4" width="5" height="16" rx="1"/><rect x="10" y="4" width="5" height="11" rx="1"/><rect x="17" y="4" width="4" height="7" rx="1"/>',
    "code": '<path d="m8 7-5 5 5 5"/><path d="m16 7 5 5-5 5"/><path d="M13.5 4l-3 16"/>',
    "database": '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5"/><path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>',
    "bot": '<rect x="4" y="8" width="16" height="12" rx="3"/><path d="M12 4v4M9 13h.01M15 13h.01M9 17h6"/>',
    "book": '<path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v17H6.5A2.5 2.5 0 0 0 4 21.5v-17Z"/><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>',
    "diagram": '<rect x="3" y="3" width="7" height="6" rx="1"/><rect x="14" y="15" width="7" height="6" rx="1"/><path d="M6.5 9v4.5a1.5 1.5 0 0 0 1.5 1.5h6"/>',
    "shield": '<path d="M12 3 4 6v6c0 5 3.4 8.4 8 9 4.6-.6 8-4 8-9V6l-8-3Z"/><path d="m9 12 2 2 4-4"/>',
    "server": '<rect x="3" y="4" width="18" height="7" rx="2"/><rect x="3" y="13" width="18" height="7" rx="2"/><path d="M7 7.5h.01M7 16.5h.01"/>',
    "open": '<circle cx="12" cy="12" r="9"/><path d="M12 7a5 5 0 1 0 5 5"/>',
    "drupal": '<path d="M12 2c1 3 6 5 6 11a6 6 0 0 1-12 0c0-6 5-8 6-11Z"/><path d="M9 15c1.5 1.5 4.5 1.5 6 0"/>',
    "clock": '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    "chat": '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12Z"/>',
    "milestone": '<path d="M5 21V4"/><path d="M5 4h11l-2 4 2 4H5"/>',
    "git": '<circle cx="6" cy="6" r="2.5"/><circle cx="6" cy="18" r="2.5"/><circle cx="18" cy="9" r="2.5"/><path d="M6 8.5v7M18 11.5c0 3-3 4-7 4.5"/>',
}


def icon(name):
    return ('<span class="icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" '
            'stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">%s</svg></span>' % ICONS[name])


def jpeg_size(path):
    data = path.read_bytes()
    i = 2
    while i < len(data):
        if data[i] != 0xFF:
            i += 1
            continue
        marker = data[i + 1]
        if marker in (0xC0, 0xC1, 0xC2):
            h, w = struct.unpack(">HH", data[i + 5:i + 9])
            return w, h
        i += 2 + struct.unpack(">H", data[i + 2:i + 4])[0]
    return 1440, 900


def shot(spec, eager=False):
    name, _, alt = spec.partition("|")
    dark = name.startswith("dark:")
    name = name.removeprefix("dark:")
    path = ROOT / "assets" / "img" / "screens" / (name + ".jpg")
    w, h = jpeg_size(path)
    loading = 'fetchpriority="high"' if eager else 'loading="lazy" decoding="async"'
    return ('<figure class="frame%s reveal"><img src="/assets/img/screens/%s.jpg" width="%d" height="%d" alt="%s" %s></figure>'
            % (" dark" if dark else "", name, w, h, html.escape(alt.strip(), quote=True), loading))


def expand(body):
    body = re.sub(r"\{\{shot!:([^}]+)\}\}", lambda m: shot(m.group(1), eager=True), body)
    body = re.sub(r"\{\{shot:([^}]+)\}\}", lambda m: shot(m.group(1)), body)
    body = re.sub(r"\{\{icon:([a-z-]+)\}\}", lambda m: icon(m.group(1)), body)
    return body.replace("{{repo}}", REPO).replace("{{docs}}", DOCS)


SOFTWARE = {
    "@type": "SoftwareApplication",
    "name": "Divengine Studio",
    "applicationCategory": "DeveloperApplication",
    "applicationSubCategory": "Engineering context and traceability platform",
    "operatingSystem": "Linux (self-hosted, PHP 8.4 and PostgreSQL)",
    "softwareRequirements": "PHP 8.4, PostgreSQL 16+, Composer 2",
    "license": "https://www.gnu.org/licenses/gpl-3.0.html",
    "isAccessibleForFree": True,
    "offers": {"@type": "Offer", "price": "0", "priceCurrency": "USD"},
    "url": SITE + "/",
    "downloadUrl": REPO,
    "codeRepository": REPO,
    "image": SITE + "/assets/og/home.png",
    "description": "Open source, self-hosted platform for engineering context, built on Drupal: requirements, "
                   "decisions, models, process, tests, evidence, code and database schemas kept as connected, "
                   "versioned and traceable records.",
    "publisher": {"@type": "Organization", "name": "Divengine Software Solutions", "url": SITE + "/"},
}


def jsonld(meta):
    graph = [{"@type": "Organization", "@id": SITE + "/#org", "name": "Divengine Software Solutions",
              "url": SITE + "/", "logo": SITE + "/assets/img/logo.svg", "email": "contact@divengine.com",
              "sameAs": ["https://github.com/divengine"]},
             {"@type": "WebSite", "@id": SITE + "/#site", "name": "Divengine Studio", "url": SITE + "/",
              "publisher": {"@id": SITE + "/#org"}}]
    if meta.get("software"):
        graph.append(SOFTWARE)
    if meta["path"] != "/":
        graph.append({"@type": "BreadcrumbList", "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "Home", "item": SITE + "/"},
            {"@type": "ListItem", "position": 2, "name": meta["crumb"], "item": SITE + meta["path"]}]})
    if meta.get("faq"):
        graph.append({"@type": "FAQPage", "mainEntity": [
            {"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in meta["faq"]]})
    return json.dumps({"@context": "https://schema.org", "@graph": graph}, ensure_ascii=False, indent=1)


def faq_html(items):
    return "\n".join('<details><summary>%s</summary><p>%s</p></details>' % (html.escape(q), a) for q, a in items)


LAYOUT = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
<meta name="description" content="{description}">
<link rel="canonical" href="{url}">
<meta name="robots" content="{robots}">
<meta name="theme-color" content="#142846">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Divengine Studio">
<meta property="og:title" content="{og_title}">
<meta property="og:description" content="{description}">
<meta property="og:url" content="{url}">
<meta property="og:image" content="{og_image}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{og_title}">
<meta name="twitter:description" content="{description}">
<meta name="twitter:image" content="{og_image}">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&amp;family=Outfit:wght@600;700;800&amp;display=swap" rel="stylesheet">
<link rel="stylesheet" href="/assets/css/site.css">
<script>document.documentElement.classList.add("js")</script>
<script type="application/ld+json">
{jsonld}
</script>
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
<header class="site-header">
  <div class="wrap">
    <a class="brand" href="/" aria-label="Divengine Studio home"><img src="/assets/img/logo.svg" alt="" width="36" height="33">Divengine Studio</a>
    <button class="menu-toggle" aria-controls="nav" aria-expanded="false" aria-label="Menu"><span></span><span></span><span></span></button>
    <nav class="nav" id="nav" aria-label="Main">
{nav}
      <a class="btn btn-primary" href="/get-studio/"{get_current}>Get Studio</a>
    </nav>
  </div>
</header>
<main id="main">
{body}
</main>
<footer class="site-footer">
  <div class="wrap">
    <div class="footer-grid">
      <div>
        <a class="brand" href="/"><img src="/assets/img/logo.svg" alt="" width="36" height="33">Divengine Studio</a>
        <p>Open source platform for explicit, connected engineering knowledge, built on Drupal. Install it on your own server and make it yours.</p>
      </div>
      <div>
        <h2>Product</h2>
        <ul>
          <li><a href="/product/">Records &amp; traceability</a></li>
          <li><a href="/knowledge/">Requirements, decisions &amp; models</a></li>
          <li><a href="/process/">Unified Process</a></li>
          <li><a href="/quality/">Validation &amp; evidence</a></li>
          <li><a href="/code-and-data/">Code, databases &amp; AI</a></li>
          <li><a href="/work/">Projects &amp; time</a></li>
        </ul>
      </div>
      <div>
        <h2>Get started</h2>
        <ul>
          <li><a href="/get-studio/">Download &amp; install</a></li>
          <li><a href="{docs}">Documentation</a></li>
          <li><a href="{repo}">Source code</a></li>
          <li><a href="{repo}/blob/main/LICENSE">License (GPL-3.0)</a></li>
        </ul>
      </div>
      <div>
        <h2>Divengine</h2>
        <ul>
          <li><a href="/about/">Vision</a></li>
          <li><a href="/about/#roadmap">Roadmap</a></li>
          <li><a href="https://github.com/rafageist/explicit-software-engineering-method">ESEM (independent method)</a></li>
          <li><a href="/about/#contribute">Contribute</a></li>
          <li><a href="mailto:contact@divengine.com">contact@divengine.com</a></li>
        </ul>
      </div>
    </div>
    <div class="footer-bottom">
      <span>© 2026 Divengine Software Solutions. Divengine Studio is free software under the GNU GPL v3.</span>
      <span>Drupal is a registered trademark of Dries Buytaert.</span>
    </div>
  </div>
</footer>
<script src="/assets/js/site.js" defer></script>
</body>
</html>
"""


def build():
    urls = []
    for source in sorted(PAGES.glob("*.html")):
        text = source.read_text(encoding="utf-8")
        head, _, body = text.partition("\n")
        meta = json.loads(head.strip()[4:-3])
        path = meta["path"]
        nav = "\n".join('      <a href="%s"%s>%s</a>' % (href, ' aria-current="page"' if key == meta.get("nav") else "", html.escape(label))
                        for key, href, label in NAV)
        body = expand(body)
        if meta.get("faq"):
            body = body.replace("{{faq}}", faq_html(meta["faq"]))
            meta["faq"] = [(q, re.sub(r"<[^>]+>", "", a)) for q, a in meta["faq"]]
        page = LAYOUT.format(
            title=html.escape(meta["title"]),
            description=html.escape(meta["description"], quote=True),
            url=SITE + path,
            robots=meta.get("robots", "index, follow"),
            og_title=html.escape(meta.get("og_title", meta["title"]), quote=True),
            og_image=SITE + "/assets/og/%s.png" % meta.get("og", "home"),
            jsonld=jsonld(meta),
            nav=nav,
            get_current=' aria-current="page"' if meta.get("nav") == "get-studio" else "",
            body=body.strip(),
            repo=REPO,
            docs=DOCS,
        )
        target = ROOT / (path.strip("/") + "/index.html" if path.endswith("/") and path != "/" else path.lstrip("/") or "index.html")
        if path == "/":
            target = ROOT / "index.html"
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(page, encoding="utf-8")
        if meta.get("robots", "").startswith("noindex"):
            continue
        urls.append((path, meta.get("priority", "0.8")))
    sitemap = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for path, priority in sorted(urls, key=lambda u: (u[0] != "/", u[0])):
        sitemap.append("  <url><loc>%s%s</loc><lastmod>%s</lastmod><priority>%s</priority></url>" % (SITE, path, LASTMOD, priority))
    sitemap.append("</urlset>")
    (ROOT / "sitemap.xml").write_text("\n".join(sitemap) + "\n", encoding="utf-8")
    print("built %d pages" % len(list(PAGES.glob("*.html"))))


if __name__ == "__main__":
    build()
