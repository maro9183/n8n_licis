const { chromium } = require('playwright');

async function scrapeLicitacionesGBA() {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  try {
    console.log("🌐 Entrando a la página...");

    await page.goto(
      'https://sistemas.ms.gba.gov.ar/LicitacionesyContrataciones/web/app.php/publico/licitacion/lista',
      {
        waitUntil: 'networkidle',
        timeout: 120000
      }
    );

    console.log("🔍 Ejecutando búsqueda Salud PBA...");

    await page.click('button[id^="buscar-form"]');

    await page.waitForSelector('table tbody tr', { timeout: 60000 });

    const totalPages = await page.$eval(
      'span[id^="totalPages"]',
      el => parseInt(el.innerText.trim())
    );

    console.log(`📊 Total páginas: ${totalPages}`);

    const results = [];
    const seenFirstRows = new Set(); // 🔥 control de duplicados

    const MAX_PAGES = 100;
    const limit = Math.min(totalPages, MAX_PAGES);

    for (let i = 1; i <= limit; i++) {
      console.log(`📄 Página Salud PBA ${i}`);

      await page.waitForSelector('table tbody tr', { timeout: 30000 });

      // 🔑 snapshot real
      const firstRow = await page.$eval(
        'table tbody tr',
        row => row.innerText.trim()
      );

      if (seenFirstRows.has(firstRow)) {
        throw new Error(`Duplicado detectado en página ${i}`);
      }
      seenFirstRows.add(firstRow);

      const pageData = await page.$$eval('table tbody tr', rows => {
        return rows.map(row => {
          const cols = row.querySelectorAll('td');

          return {
            apertura: cols[0]?.innerText.trim(),
            dependencia: cols[1]?.innerText.trim(),
            tipo: cols[2]?.innerText.trim(),
            anio: cols[3]?.innerText.trim(),
            numero_orden: cols[4]?.innerText.trim(),
            llamado: cols[5]?.innerText.trim(),
            objeto: cols[6]?.innerText.trim(),
            detalle_url: cols[7]?.querySelector('a')?.href || null
          };
        });
      });

      if (!pageData.length) {
        throw new Error(`Página ${i} sin datos`);
      }

      console.log(`✅ Registros: ${pageData.length}`);
      results.push(...pageData);

      if (i === limit) break;

      console.log("➡️ Siguiente página...");

      const nextBtn = await page.$('button[id^="nextPage"]');

      if (!nextBtn) throw new Error("Botón nextPage no encontrado");

      const isDisabled = await page.$eval(
        'button[id^="nextPage"]',
        btn => btn.disabled
      );

      if (isDisabled) {
        throw new Error(`nextPage deshabilitado en página ${i}`);
      }

      await Promise.all([
        page.click('button[id^="nextPage"]'),

        // 🔥 cambio REAL de datos (no solo número de página)
        page.waitForFunction(
          (prev) => {
            const row = document.querySelector('table tbody tr');
            return row && row.innerText.trim() !== prev;
          },
          firstRow,
          { timeout: 30000 }
        )
      ]);

      // 🔍 validación adicional
      const currentPage = await page.$eval(
        'span[id^="actualPage"]',
        el => parseInt(el.innerText.trim())
      );

      if (currentPage !== i + 1) {
        throw new Error(
          `Desfase paginación: esperaba ${i + 1}, obtuvo ${currentPage}`
        );
      }

      console.log(`🔄 Página confirmada: ${currentPage}`);
    }

    console.log(`🎯 Total registros: ${results.length}`);

    if (!results.length) {
      throw new Error("Resultado vacío → posible cambio en la web");
    }

    return results;

  } catch (error) {
    console.error("❌ ERROR LICITACIONES GBA:", error.message);

    try {
      await page.screenshot({
        path: '/app/debug_gba.png',
        fullPage: true
      });
      console.log("📸 Screenshot generado");
    } catch {}

    throw error;

  } finally {
    await browser.close();
  }
}

module.exports = scrapeLicitacionesGBA;