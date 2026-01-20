const express = require("express");
const { chromium } = require("playwright");

const app = express();
const PORT = process.env.PORT || 3000;

const LOGIN = "vulkan21";

// ---- helpers ----
function extractNumberOrText(s) {
  if (s === undefined || s === null) return "";
  const str = String(s).trim();
  const m = str.match(/-?\d+/);
  return m ? m[0] : str;
}

function getNumFromQuery(req) {
  // /zombie?num=1234
  if (req.query && req.query.num) return String(req.query.num);

  // /zombie?1234  -> query key = "1234"
  if (req.query) {
    const keys = Object.keys(req.query);
    if (keys.length > 0) return String(keys[0]);
  }
  return null;
}

// ---- routes ----
app.get("/", (req, res) => {
  res.type("text/plain").send("OK");
});

app.get("/login", (req, res) => {
  res.type("text/plain").send(LOGIN);
});

// /zombie/1234 -> редиректим на /zombie?1234
app.get("/zombie/:num", (req, res) => {
  res.redirect(302, `/zombie?${req.params.num}`);
});

// /zombie?1234  и /zombie?num=1234
app.get("/zombie", async (req, res) => {
  let browser;
  try {
    const num = getNumFromQuery(req);

    if (!num || !/^\d+$/.test(num)) {
      return res.status(400).type("text/plain").send("Bad number");
    }

    const url = `https://kodaktor.ru/g/d7290da?${num}`;
    console.log("[zombie] num =", num);
    console.log("[zombie] url =", url);

    browser = await chromium.launch({
      headless: true,
      args: ["--no-sandbox"]
    });

    const page = await browser.newPage();

    // откроем страницу
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });

    // title ДО клика
    const oldTitle = await page.title();
    console.log("[zombie] oldTitle =", oldTitle);

    // найдём кнопку / инпут
    const btn =
      (await page.$("button")) ||
      (await page.$("input[type=button]")) ||
      (await page.$("input[type=submit]")) ||
      (await page.$("[onclick]"));

    if (!btn) throw new Error("Button not found");

    // клик
    await btn.click();

    // ждём изменения title (но если не изменится — не падаем)
    try {
      await page.waitForFunction(
        (t) => document.title && document.title !== t,
        oldTitle,
        { timeout: 5000 }
      );
    } catch (_) {}

    // немного времени на JS
    await page.waitForTimeout(400);

    // читаем результат: title + h1
    const title = await page.title();
    const h1 = await page
      .$eval("h1", (el) => (el.textContent || "").trim())
      .catch(() => "");

    console.log("[zombie] title =", title);
    console.log("[zombie] h1    =", h1);

    // выбираем лучший кандидат
    // (на kodaktor часто h1 = HERZEN/не то, тогда берём title)
    let candidate = "";
    if (h1 && h1.length > 0 && h1.toUpperCase() !== "HERZEN") candidate = h1;
    else candidate = title;

    const out = extractNumberOrText(candidate);

    console.log("[zombie] OUT  =", out);

    res.type("text/plain").send(out);
  } catch (e) {
    console.error("[zombie] ERROR:", e);
    res.status(500).type("text/plain").send("ERR: " + e.message);
  } finally {
    if (browser) await browser.close();
  }
});

// ---- start ----
app.listen(PORT, () => {
  console.log("Server listening on port", PORT);
});
