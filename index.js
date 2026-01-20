const express = require("express");
const puppeteer = require("puppeteer");
const app = express();
const PORT = 3000;

let browser;

// Инициализация браузера при запуске
async function initBrowser() {
  browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
}

// Маршрут /login
app.get("/login", (req, res) => {
  res.send("vulkan21");
});

// Маршрут /zombie
app.get('/zombie/:num', async (req, res) => {
  try {
    const num = req.params.num;
    
    if (!num) {
      return res.status(400).type('text/plain').send('Missing parameter');
    }

    const page = await browser.newPage();
    const targetUrl = `https://kodaktor.ru/g/d7290da?${num}`;
    
    await page.goto(targetUrl, { waitUntil: 'networkidle2' });
    await page.waitForSelector('button', { timeout: 5000 });
    await page.click('button');
    await new Promise(r => setTimeout(r, 1000));

    const result = await page.evaluate(() => {
      return document.title;
    });

    await page.close();
    res.type('text/plain').send(result);

  } catch (error) {
    console.error('Error:', error.message);
    res.status(500).type('text/plain').send('Error: ' + error.message);
  }
});


// Запуск сервера
initBrowser()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Failed to initialize browser:", err);
    process.exit(1);
  });

// Корректное завершение
process.on("SIGINT", async () => {
  if (browser) {
    await browser.close();
  }
  process.exit(0);
});

