// Renders the Open Graph cards and the touch icon with Playwright:
//   node _build/og.js <playwright-module-path>   (run from the repository root)
const path = require("path");
const { chromium } = require(process.argv[2] || "playwright");
const root = path.resolve(__dirname, "..");
const cards = {
  home: ["Software engineering, explicit and traceable.", "Requirements, models, process, tests, code and databases, connected.", "development-overview"],
  product: ["One workspace for what your team knows", "Developments, explicit records, traces and discussions.", "requirements"],
  process: ["The Unified Process, executable", "Phases, readiness, change requests and baselines.", "readiness"],
  knowledge: ["Requirements, models and traceability", "Use cases, BPMN, UML and a knowledge base that links.", "bpmn"],
  quality: ["Test management with proof", "Plans, runs, evidence, QA issues and coverage.", "test-run"],
  work: ["Projects, boards and timesheets", "Plan the work next to the reasons for it.", "kanban"],
  "code-and-data": ["Code, database schemas and AI agents", "Browse Git, explore schemas, connect assistants via MCP.", "schema-explorer"],
  "get-studio": ["Free, open source, self-hosted", "Install it on your own server with one recipe.", "development-overview"],
  about: ["Engineering discipline as infrastructure", "The vision and roadmap of Divengine Studio.", "development-overview"],
};
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
  for (const [name, card] of Object.entries(cards)) {
    await page.goto("file://" + root + "/_build/og.html?" + name + "#" + encodeURIComponent(card.join("|")));
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(400);
    await page.screenshot({ path: root + "/assets/og/" + name + ".png" });
    console.log("og", name);
  }
  const icon = await browser.newPage({ viewport: { width: 180, height: 180 } });
  await icon.setContent('<body style="margin:0;background:#335999;display:grid;place-items:center;height:180px"><img src="file://' + root + '/assets/img/logo.svg" style="width:150px"></body>');
  await icon.waitForTimeout(200);
  await icon.screenshot({ path: root + "/apple-touch-icon.png" });
  await browser.close();
})();
