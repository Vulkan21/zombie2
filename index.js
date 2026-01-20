const express = require("express");
const { chromium } = require("playwright");

const app = express();
const PORT = process.env.PORT || 3000;
const LOGIN = "vulkan21";

app.get("/", (req, res) => res.type("text/plain").send("OK"));

app.get(["/login", "/zombie/login", "/zombie//login"], (req, res) => {
  res.type("text/plain").send(LOGIN);
});

function getNum(req) {
  // /zombie/1234
  if (req.params?.num) return String(req.params.num);

  // /zombie?num=1234  /zombie?x=1234  -> берем ПЕРВОЕ значение
  const vals = Object.values(req.query || {});
  if (vals.length && vals[0] != null && String(vals[0]).trim() !== "") {
    return String(vals[0]).trim();
  }

  // /zombie?1234 -> ключ "1234"
  const keys = Object.keys(req.query || {});
  if (keys.length) return String(keys[0]).trim();

  // fallback: вытащить цифры из url
  const m = (req.originalUrl || "").match(/(\d+)/);
  return m ? m[1] : null;
}

async function runZombie(num) {
  if (!num || !/^\d+$/.test(num)) throw new Error("Bad number");

  const url = `https://kodaktor.ru/g/d7290da?${num}`;

  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox"]
  });

  try {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });

    const oldTitle = await page.title();

    // клик строго по нужной кнопке
    await page.click(".gossclicker", { timeout: 7000 });

    // ждём изменения title
    await page.waitForFunction(
      (t) => document.title && document.title !== t,
      oldTitle,
      { timeout: 10000 }
    );

    const title = (await page.title()).trim();
    return title;
  } finally {
    await browser.close();
  }
}

// принимаем /zombie, /zombie/, /zombie/1234 и т.п.
app.get(
  ["/zombie", "/zombie/", "/zombie/:num", "/zombie//", "/zombie//:num", "/zombie/zombie", "/zombie/zombie/:num"],
  async (req, res) => {
    try {
      const num = getNum(req);

      const resultTitle = await runZombie(num);

      // ✅ КЛЮЧЕВОЕ: отдаём и в body, и в HTTP-заголовках
      res.set("Content-Type", "text/plain; charset=utf-8");
      res.set("X-Result", resultTitle);
      res.set("X-Answer", resultTitle);
      res.set("X-Title", resultTitle);

      // иногда ожидают без переносов
      res.status(200).send(resultTitle);
    } catch (e) {
      res.status(500).type("text/plain").send("ERR: " + e.message);
    }
  }
);

app.listen(PORT, () => console.log("Server listening on", PORT));
