const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { mkdir, writeFile } = require('fs/promises');

const MAX_DEPTH = 2; // Максимальная глубина рекурсии
const baseURL = 'https://kaspi.kz';

const downloadDir = path.join(__dirname, 'downloads');

async function saveResponse(response) {
  try {
    const url = new URL(response.url());
    const pathname = url.pathname;

    if (!pathname || pathname.endsWith('/')) return;

    const buffer = await response.body();
    const filePath = path.join(downloadDir, pathname);

    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, buffer);
    console.log(`Сохранено: ${pathname}`);
  } catch (err) {
    console.error(`Ошибка при сохранении: ${response.url()}`, err);
  }
}

async function crawl(page, url, depth, visited) {
  if (depth > MAX_DEPTH || visited.has(url)) return;
  visited.add(url);

  console.log(`Открываем [Глубина ${depth}]: ${url}`);

  // Ловим ресурсы для сохранения
  page.on('response', async (response) => {
    const respUrl = response.url();
    if (respUrl.startsWith(baseURL)) {
      await saveResponse(response);
    }
  });

  try {
    await page.goto(url, { waitUntil: 'networkidle' });

    const content = await page.content();
    // Сохраняем html файл
    const urlObj = new URL(url);
    let fileName = urlObj.pathname.replace(/\//g, '_');
    if (!fileName || fileName === '_') fileName = 'index';
    const htmlPath = path.join(downloadDir, `${fileName}.html`);
    await mkdir(path.dirname(htmlPath), { recursive: true });
    await writeFile(htmlPath, content);
    console.log(`Страница сохранена: ${htmlPath}`);

    // Ищем ссылки на страницы того же домена
    const links = await page.$$eval('a[href]', anchors =>
      anchors.map(a => a.href).filter(href => href.startsWith('https://kaspi.kz'))
    );

    for (const link of links) {
      if (!visited.has(link)) {
        await crawl(page, link, depth + 1, visited);
      }
    }
  } catch (err) {
    console.error(`Ошибка при загрузке ${url}:`, err);
  }
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Linux; Android 10; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Mobile Safari/537.36',
    viewport: { width: 375, height: 812 },
    isMobile: true,
  });
  const page = await context.newPage();

  await mkdir(downloadDir, { recursive: true });

  const visited = new Set();
  await crawl(page, baseURL, 0, visited);

  await browser.close();
  console.log('Глубокое сканирование завершено. Как наш брат Магомед — на высоте!');
})();
