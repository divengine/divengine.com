// Renders the Open Graph cards and the touch icon with Playwright:
//   node _build/og.js <playwright-module-path>   (run from the repository root)
const path = require("path");
const { chromium } = require(process.argv[2] || "playwright");
const root = path.resolve(__dirname, "..");
const cards = {
  home: ["Engineering knowledge, explicit and connected.", "Requirements, decisions, models, code, tests and evidence, traceable.", "development-overview"],
  product: ["Engineering records you can follow", "Codes, revisions, typed traces and baselines.", "requirements"],
  process: ["The Unified Process, supported", "Phases, readiness, change requests and baselines.", "readiness"],
  knowledge: ["Requirements, decisions and models", "Structured knowledge, BPMN, UML and a linked knowledge base.", "bpmn"],
  quality: ["Validation and evidence", "Plans, frozen runs, evidence, QA issues and coverage.", "test-run"],
  work: ["Projects, boards and timesheets", "Plan the work next to the reasons for it.", "kanban"],
  "code-and-data": ["Code, docs and schemas in context", "Git, code documentation, database schemas and read-only MCP.", "schema-explorer"],
  "get-studio": ["Free, open source, self-hosted", "Install it on your own server with the web installer.", "development-overview"],
  about: ["Engineering knowledge as infrastructure", "The vision and roadmap of Divengine Studio.", "development-overview"],
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
