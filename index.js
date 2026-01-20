const express = require("express");
const { chromium } = require("playwright");

const app = express();
const PORT = process.env.PORT || 3000;
const LOGIN = "vulkan21";

app.get("/", (req, res) => res.type("text/plain").send("OK"));

// на случай если чекер криво склеит base + /login
app.get(["/login", "/zombie/login", "/zombie//login"], (req, res) => {
  res.type("text/plain").send(LOGIN);
});

function getNum(req) {
  // /zombie/1234
  if (req.params && req.params.num) return String(req.params.num);

  // /zombie?num=1234 или /zombie?x=1234 -> берем ЗНАЧЕНИЕ первого параметра
  const vals = Object.values(req.query || {});
  if (vals.length && vals[0] !== undefined && vals[0] !== null && String(vals[0]).length) {
    return String(vals[0]);
  }

  // /zombie?1234 -> ключ "1234"
  const keys = Object.keys(req.query || {});
  if (keys.length) return String(keys[0]);

  // fallback: вытащить цифры из url
  const m = (req.originalUrl || "").match(/(\d+)/);
  return m ? m[1] : null;
}

async function runZombie(num, res) {
  let browser;
  try {
    if (!num || !/^\d+$/.test(num)) {
      return res.status(400).type("text/plain").send("Bad number");
    }

    const url = `https://kodaktor.ru/g/d7290da?${num}`;

    browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
    const page = await browser.newPage();

    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });

    const oldTitle = await page.title();

    // клик строго по нужной кнопке
    await page.click(".gossclicker", { timeout: 5000 });

    // ждём смены title
    await page.waitForFunction(
      (t) => document.title && document.title !== t,
      oldTitle,
      { timeout: 7000 }
    );

    const title = await page.title();

    // вернуть title без лишних символов/строк
    res.set("Content-Type", "text/plain; charset=utf-8");
    res.send(String(title).trim());
  } catch (e) {
    res.status(500).type("text/plain").send("ERR: " + e.message);
  } finally {
    if (browser) await browser.close();
  }
}

// принимаем /zombie, /zombie/, /zombie/1234 и даже двойные склейки
app.get(
  ["/zombie", "/zombie/", "/zombie/:num", "/zombie//", "/zombie//:num", "/zombie/zombie", "/zombie/zombie/:num"],
  async (req, res) => {
    const num = getNum(req);
    await runZombie(num, res);
  }
);

app.listen(PORT, () => console.log("Server listening on", PORT));
