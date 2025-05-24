const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { mkdir, writeFile } = require('fs/promises');

(async () => {
  const browser = await chromium.launch({ headless: true });

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Linux; Android 10; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Mobile Safari/537.36',
    viewport: { width: 375, height: 812 },
    isMobile: true
  });

  const page = await context.newPage();

  // Создаём директорию для ресурсов
  const downloadDir = path.join(__dirname, 'downloads');
  await mkdir(downloadDir, { recursive: true });

  // Сохраняем каждый загруженный ресурс
  page.on('response', async (response) => {
    try {
      const url = new URL(response.url());
      const pathname = url.pathname;

      // Пропускаем динамические или пустые пути
      if (!pathname || pathname.endsWith('/')) return;

      // Получаем содержимое
      const buffer = await response.body();
      const filePath = path.join(downloadDir, pathname);

      // Создаём директорию, если её нет
      await mkdir(path.dirname(filePath), { recursive: true });

      // Сохраняем файл
      await writeFile(filePath, buffer);
      console.log(`Сохранено: ${pathname}`);
    } catch (err) {
      console.error(`Ошибка при сохранении: ${response.url()}`);
    }
  });

  await page.goto('https://kaspi.kz', { waitUntil: 'networkidle' });

  const content = await page.content();
  fs.writeFileSync('kaspi-mobile.html', content);

  await browser.close();
})();
