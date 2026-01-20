const express = require("express");
const { chromium } = require("playwright");

const app = express();
const PORT = process.env.PORT || 3000;
const LOGIN = "vulkan21";

app.get("/login", (req, res) => res.type("text/plain").send(LOGIN));
app.get("/", (req, res) => res.type("text/plain").send("OK"));

function pickNum(req) {
  // /zombie?num=1234
  if (req.query?.num) return String(req.query.num);
  // /zombie?1234
  const keys = Object.keys(req.query || {});
  if (keys.length) return String(keys[0]);
  return null;
}

async function clickRightButton(page) {
  // 1) самые частые id
  const idSelectors = ["#button", "#btn", "#go", "#run", "#calc", "#start"];
  for (const sel of idSelectors) {
    const el = await page.$(sel);
    if (el) {
      await el.click();
      return `clicked ${sel}`;
    }
  }

  // 2) кнопка/инпут по тексту (рус/англ)
  const textVariants = ["OK", "Go", "Run", "Calc", "Start", "Посчитать", "Вычислить", "Рассчитать"];
  for (const t of textVariants) {
    // playwright text selectors
    const el = await page.$(`button:has-text("${t}")`);
    if (el) {
      await el.click();
      return `clicked button text=${t}`;
    }
    const el2 = await page.$(`input[type=button][value="${t}"], input[type=submit][value="${t}"]`);
    if (el2) {
      await el2.click();
      return `clicked input value=${t}`;
    }
  }

  // 3) fallback: первый button / input
  const btn =
    (await page.$("button")) ||
    (await page.$("input[type=button]")) ||
    (await page.$("input[type=submit]")) ||
    (await page.$("[onclick]"));

  if (!btn) throw new Error("No clickable control found");
  await btn.click();
  return "clicked fallback first-control";
}

async function runZombie(num, res) {
  let browser;
  try {
    if (!num || !/^\d+$/.test(num)) {
      return res.status(400).type("text/plain").send("Bad number");
    }

    const url = `https://kodaktor.ru/g/d7290da?${num}`;
    console.log("[zombie] url =", url);

    browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });

    const oldTitle = await page.title();
    console.log("[zombie] oldTitle =", oldTitle);

    const how = await clickRightButton(page);
    console.log("[zombie] click =", how);

    // ждём смены title
    await page.waitForFunction(
      (t) => document.title && document.title !== t,
      oldTitle,
      { timeout: 7000 }
    );

    const title = await page.title();
    console.log("[zombie] title =", title);

    res.type("text/plain").send(title);
  } catch (e) {
    console.error("[zombie] ERROR:", e);
    res.status(500).type("text/plain").send("ERR: " + e.message);
  } finally {
    if (browser) await browser.close();
  }
}

// ✅ важное: поддержим и /zombie и /zombie/
app.get(["/zombie", "/zombie/"], async (req, res) => {
  const num = pickNum(req);
  await runZombie(num, res);
});

// на всякий /zombie/1234
app.get("/zombie/:num", async (req, res) => {
  await runZombie(String(req.params.num), res);
});

app.listen(PORT, () => console.log("Server listening on", PORT));
