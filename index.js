const express = require("express");
const { chromium } = require("playwright");

const app = express();
const PORT = process.env.PORT || 3000;
const LOGIN = "vulkan21";

app.get("/", (req, res) => res.type("text/plain").send("OK"));

// принимаем /login и /zombie/login на всякий случай
app.get(["/login", "/zombie/login"], (req, res) => {
  res.type("text/plain").send(LOGIN);
});

async function runZombie(num, res) {
  let browser;
  try {
    if (!num || !/^\d+$/.test(String(num))) {
      return res.status(400).type("text/plain").send("Bad number");
    }

    const url = `https://kodaktor.ru/g/d7290da?${num}`;
    console.log("[zombie] url =", url);

    browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });

    const oldTitle = await page.title();

    const btn =
      (await page.$("button")) ||
      (await page.$("input[type=button]")) ||
      (await page.$("input[type=submit]")) ||
      (await page.$("[onclick]"));

    if (!btn) throw new Error("Button not found");
    await btn.click();

    await page.waitForFunction(
      (t) => document.title && document.title !== t,
      oldTitle,
      { timeout: 5000 }
    );

    const title = await page.title();
    console.log("[zombie] title =", title);

    // Возвращаем title КАК ЕСТЬ
    res.type("text/plain").send(title);
  } catch (e) {
    console.error("[zombie] ERROR:", e);
    res.status(500).type("text/plain").send("ERR: " + e.message);
  } finally {
    if (browser) await browser.close();
  }
}

function extractNum(req) {
  // /zombie?1234  или /zombie?num=1234
  const q = req.query.num ?? Object.keys(req.query)[0];
  if (q && /^\d+$/.test(String(q))) return String(q);

  // /zombie/1234 или даже /zombie/zombie/1234
  const m = req.path.match(/(\d+)/);
  return m ? m[1] : null;
}

// принимаем /zombie, /zombie/, /zombie/1234 и даже /zombie/zombie...
app.get(["/zombie", "/zombie/", "/zombie/:num", "/zombie/zombie", "/zombie/zombie/:num"], async (req, res) => {
  const num = req.params.num ?? extractNum(req);
  await runZombie(num, res);
});

app.listen(PORT, () => console.log("Server listening on", PORT));
