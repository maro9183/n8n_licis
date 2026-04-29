const { chromium } = require("playwright");

async function scrapePBAC() {
  const browser = await chromium.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-blink-features=AutomationControlled"
    ]
  });

  const context = await browser.newContext({
  userAgent:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36"
});

const page = await context.newPage();

  const url = "https://pbac.cgp.gba.gov.ar/ListarAperturaProxima.aspx";

  let results = [];
  let pageCount = 1;
  let visitedPages = new Set();

  try {
    console.log("🌐 PBAC: Navegando...");

    await page.goto(url, {
      waitUntil: "load",
      timeout: 120000
    });

    console.log("⏳ Esperando tabla...");
    await page.waitForSelector("table", { timeout: 60000 });

    while (true) {

      if (visitedPages.has(pageCount)) break;
      visitedPages.add(pageCount);

      console.log(`📄 PBAC página ${pageCount}`);

      const rows = await page.$$eval("table tr", trs =>
        trs
          .slice(1)  // saltar header
          .filter(tr => {
            // Excluir filas del paginador (links con 'Page$' en el href)
            const anchors = Array.from(tr.querySelectorAll('a'));
            return !anchors.some(a => (a.getAttribute('href') || '').includes('Page$'));
          })
          .map(tr =>
            Array.from(tr.querySelectorAll("td")).map(td => td.innerText.trim())
          )
      );

      console.log(`✅ Filas: ${rows.length}`);

      results.push(
        ...rows
          .filter(row => row.length >= 2 && row[0])  // descartar filas vacías/header
          .map(row => ({
            numero_proceso:  row[0] || "",
            nombre_proceso:  row[1] || "",
            tipo_proceso:    row[2] || "",
            fecha_apertura:  row[3] || "",
            estado:          row[4] || "",
            unidad_ejecutora: row[5] || "",
            url:             ""  // PBAC no expone URL directa en el listado
          }))
      );

      const nextPageNumber = pageCount + 1;
      const nextSelector = `a[href*="Page$${nextPageNumber}"]`;

      const nextButton = await page.$(nextSelector);

      if (!nextButton) break;

      await nextButton.click();

      // Esperar a que la tabla se actualice antes de seguir
      await page.waitForSelector('table', { timeout: 30000 }).catch(() => {});
      await page.waitForTimeout(1500);

      pageCount++;

      if (pageCount > 50) break;
    }

    await browser.close();

    console.log(`🎯 Total PBAC: ${results.length}`);

    return results;

  } catch (err) {
    console.error("❌ ERROR PBAC:", err.message);
    await browser.close();
    if (results.length > 0) {
      console.warn(`⚠️ Devolviendo ${results.length} registros parciales de PBAC pese al error.`);
      return results;
    }
    throw err;
  }
}

module.exports = scrapePBAC;