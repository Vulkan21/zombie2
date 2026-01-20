const express = require("express");
const { chromium } = require("playwright");

const app = express();
const PORT = process.env.PORT || 3000;
const LOGIN = "vulkan21";

app.get("/", (req, res) => res.type("text/plain").send("OK"));

app.get("/login", (req, res) => {
  res.type("text/plain").send(LOGIN);
});

async function zombieRun(num, res) {
  let browser;
  try {
    if (!num || !/^\d+$/.test(String(num))) {
      return res.status(400).type("text/plain").send("Bad number");
    }

    const url = `https://kodaktor.ru/g/d7290da?${num}`;
    browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
    const page = await browser.newPage();

    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });

    const oldTitle = await page.title();

    // ✅ кликаем строго по нужной кнопке
    await page.click(".gossclicker");

    // ждём смены title
    await page.waitForFunction(
      (t) => document.title && document.title !== t,
      oldTitle,
      { timeout: 7000 }
    );

    const title = await page.title();

    // ✅ отдаём title как есть
    res.type("text/plain").send(title);
  } catch (e) {
    res.status(500).type("text/plain").send("ERR: " + e.message);
  } finally {
    if (browser) await browser.close();
  }
}

// /zombie?1234 или /zombie?num=1234
app.get("/zombie", async (req, res) => {
  const num = req.query.num ?? Object.keys(req.query)[0];
  await zombieRun(num, res);
});

// /zombie/1234 (на всякий)
app.get("/zombie/:num", async (req, res) => {
  await zombieRun(req.params.num, res);
});

app.listen(PORT, () => console.log("Server listening on", PORT));
