const express = require("express");
const puppeteer = require("puppeteer");

const app = express();
const PORT = process.env.PORT || 3000;
const LOGIN = "vulkan21";

let browser;

async function initBrowser() {
  browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
}

app.get("/", (req, res) => res.type("text/plain").send("OK"));

app.get("/login", (req, res) => {
  res.type("text/plain").send(LOGIN);
});

function extractNum(req) {
  // /zombie/1234
  if (req.params?.num) return String(req.params.num);

  // /zombie?num=1234 (или любое имя параметра)
  const vals = Object.values(req.query || {});
  if (vals.length && vals[0] != null && String(vals[0]).trim() !== "") {
    return String(vals[0]).trim();
  }

  // /zombie?1234
  const keys = Object.keys(req.query || {});
  if (keys.length) return String(keys[0]).trim();

  return null;
}

async function handleZombie(num, res) {
  if (!num || !/^\d+$/.test(num)) {
    return res.status(400).type("text/plain").send("Bad number");
  }

  const page = await browser.newPage();
  try {
    const targetUrl = `https://kodaktor.ru/g/d7290da?${num}`;
    await page.goto(targetUrl, { waitUntil: "networkidle2", timeout: 30000 });

    // кликаем именно нужную кнопку
    await page.waitForSelector(".gossclicker", { timeout: 7000 });
    await page.click(".gossclicker");

    // ждём, пока title поменяется
    const oldTitle = await page.title();
    await page.waitForFunction(
      (t) => document.title && document.title !== t,
      { timeout: 10000 },
      oldTitle
    );

    const result = (await page.title()).trim();
    res.type("text/plain").send(result);
  } catch (e) {
    res.status(500).type("text/plain").send("ERR: " + e.message);
  } finally {
    await page.close();
  }
}

// /zombie/1234
app.get("/zombie/:num", async (req, res) => {
  const num = extractNum(req);
  await handleZombie(num, res);
});

// /zombie?1234 и /zombie?num=1234
app.get(["/zombie", "/zombie/"], async (req, res) => {
  const num = extractNum(req);
  await handleZombie(num, res);
});

initBrowser()
  .then(() => {
    app.listen(PORT, () => console.log("Server listening on port", PORT));
  })
  .catch((err) => {
    console.error("Failed to initialize browser:", err);
    process.exit(1);
  });

process.on("SIGINT", async () => {
  if (browser) await browser.close();
  process.exit(0);
});
