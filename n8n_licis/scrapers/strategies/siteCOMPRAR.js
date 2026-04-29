const { chromium } = require('playwright');

const MAX_PAGES = 200;  // límite de seguridad alto — en la práctica para el deadline de tiempo o cuando no hay más páginas
const MAX_RUNTIME_MS = 10 * 60 * 1000;  // 10 min de deadline interno
const ENTRY_URL = 'https://comprar.gob.ar/Compras.aspx?qs=W1HXHGHtH10=';

async function scrapeComprar() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36'
  });
  const page = await context.newPage();

  try {
    console.log("🌐 Abriendo COMPRAR (Próxima Apertura)...");
    await page.goto(ENTRY_URL, {
      waitUntil: 'networkidle',
      timeout: 60000
    });

    let seenSnapshots = new Set();
    let results = [];
    const deadline = Date.now() + MAX_RUNTIME_MS;  // límite de tiempo interno

    for (let i = 1; i <= MAX_PAGES; i++) {
      // Chequeo de deadline interno — devolver parciales si nos acercamos al límite
      if (Date.now() >= deadline) {
        console.warn(`⏰ Deadline alcanzado en página ${i} — devolviendo ${results.length} registros parciales`);
        break;
      }

      console.log(`\n📄 Página ${i}`);

      // --- Esperar tabla específica
      await page.waitForSelector('table[id*="GridListaPliegosAperturaProxima"]', { timeout: 60000 });

      // --- Snapshot para evitar bucles
      const snapshot = await page.$$eval(
        'table[id*="GridListaPliegosAperturaProxima"] tr',
        rows => rows.slice(1, 6).map(r => r.innerText.trim()).join('|')
      );

      if (seenSnapshots.has(snapshot)) {
        console.log("🏁 Página repetida o final alcanzado");
        break;
      }
      seenSnapshots.add(snapshot);

      // --- Extraer datos (excluye filas de paginación del GridView)
      const pageData = await page.$$eval('table[id*="GridListaPliegosAperturaProxima"] tr', rows => {
        return rows
          .filter(r => r.querySelectorAll('td').length >= 6)
          .filter(r => {
            // Las filas del paginador tienen links con href que contiene 'Page$'
            // Las filas de datos reales NO tienen ese patrón
            const anchors = Array.from(r.querySelectorAll('a'));
            return !anchors.some(a => (a.getAttribute('href') || '').includes('Page$'));
          })
          .map(r => {
            const cols = r.querySelectorAll('td');
            return {
              numero:    cols[0]?.innerText.trim(),
              nombre:    cols[1]?.innerText.trim(),
              tipo:      cols[2]?.innerText.trim(),
              fecha:     cols[3]?.innerText.trim(),
              estado:    cols[4]?.innerText.trim(),
              unidad:    cols[5]?.innerText.trim(),
              organismo: cols[6]?.innerText.trim(),
              url:       cols[0]?.querySelector('a')?.href || ""
            };
          });
      });

      console.log(`✅ Registros found: ${pageData.length}`);
      results.push(...pageData);

      // --- Paginación
      if (i === MAX_PAGES) {
        console.log("⛔ Limitador de páginas alcanzado");
        break;
      }

      const nextPageIndex = i + 1;
      const nextListPage = Math.ceil(nextPageIndex / 10);
      const currentListPage = Math.ceil(i / 10);

      // Si necesitamos cambiar de "bloque" de páginas (del 1-10 al 11-20 etc)
      let nextLinkSelector = `a[href*="Page$${nextPageIndex}"]`;
      
      const nextExists = await page.$(nextLinkSelector);
      if (!nextExists) {
        console.log("🏁 No hay más páginas (o selector de página no encontrado)");
        break;
      }

      console.log(`➡️ Yendo a página ${nextPageIndex}...`);
      
      await Promise.all([
        page.waitForResponse(
          response =>
            response.url().includes('Compras.aspx') &&
            response.request().method() === 'POST',
          { timeout: 30000 }
        ).catch(() => {
          console.warn('⚠️ waitForResponse timeout en paginación, continuando...');
        }),
        page.click(nextLinkSelector)
      ]);

      // Esperar a que la tabla se actualice en lugar de tiempo fijo
      await page.waitForSelector('table[id*="GridListaPliegosAperturaProxima"]', { timeout: 30000 }).catch(() => {});
      await page.waitForTimeout(1000);
    }

    console.log(`\n🎯 Total registros COMPRAR: ${results.length}`);
    return results;

  } catch (error) {
    console.error("❌ ERROR COMPRAR:", error.message);
    try { await page.screenshot({ path: 'error_comprar.png', fullPage: true }); } catch (_) {}
    if (results.length > 0) {
      console.warn(`⚠️ Devolviendo ${results.length} registros parciales de COMPRAR pese al error.`);
      return results;
    }
    throw error;
  } finally {
    await browser.close();
  }
}

module.exports = scrapeComprar;