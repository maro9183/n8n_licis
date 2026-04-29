const { chromium } = require('playwright');

const ENTRY_URL = 'https://www.scba.gov.ar/informacion/consulta2.asp';

async function scrapeSCBA() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36'
  });
  const page = await context.newPage();

  try {
    console.log("🌐 Abriendo SCBA...");
    await page.goto(ENTRY_URL, {
      waitUntil: 'networkidle',
      timeout: 60000
    });

    // --- Seleccionar "Todos" en los 3 primeros campos según instrucciones del usuario
    console.log("⚙️ Configurando filtros (Todos)...");
    
    // Objeto: cmbGrupo
    await page.selectOption('#cmbGrupo', { label: 'Todos' });
    
    // Tipo de trámite: cmbTipoTramite
    await page.selectOption('#cmbTipoTramite', { label: 'Todos' });
    
    // Lugar de Apertura: cmbLugarApertura
    await page.selectOption('#cmbLugarApertura', { label: 'Todos' });

    // Pequeña espera para que los eventos de JS se procesen si es necesario
    await page.waitForTimeout(1000);

    // --- Ejecutar búsqueda
    console.log("🔍 Ejecutando búsqueda...");
    // El usuario especificó el botón con ID 'buscar'
    await page.click('#buscar');

    // --- Esperar un tiempo prudencial para que la tabla esté lista
    console.log("⏳ Esperando resultados...");
    
    // Esperamos a que el texto "Se han encontrado" esté presente
    // Y esperamos un poco más para que la tabla se renderice completamente
    await page.waitForSelector('text=Se han encontrado', { timeout: 60000 });
    await page.waitForTimeout(2000); 

    // --- Extraer datos de la tabla
    // Usamos un selector más genérico para la tabla por si .table-responsive no está
    const results = await page.$$eval('table tr', rows => {
      return rows.map(r => {
        const cols = r.querySelectorAll('td');
        if (cols.length < 6) return null;

        const numCell = cols[0];
        const linkElem = cols[cols.length - 1]?.querySelector('a'); // Last column
        const onclick = linkElem?.getAttribute('onclick') || "";
        
        const idMatch = onclick.match(/'(\d+)'/);
        const id = idMatch ? idMatch[1] : "";

        // Replace &nbsp; and multiple spaces
        const cleanText = (text) => text?.innerText.replace(/\s+/g, ' ').trim() || "";

        return {
          numero: cleanText(cols[0]),
          departamento: cleanText(cols[1]),
          detalle: cleanText(cols[2]),
          apertura: cleanText(cols[3]),
          resuelto: cleanText(cols[4]),
          url: id ? `https://www.scba.gov.ar/informacion/TramiteCompleto.asp?IdTramite=${id}` : "" 
        };
      }).filter(item => 
        item !== null && 
        item.numero !== "" && 
        !item.numero.toLowerCase().includes('número') &&
        !item.numero.toLowerCase().includes('objeto')
      );
    });

    console.log(`✅ SCBA: ${results.length} registros encontrados`);
    return results;

  } catch (error) {
    console.error("❌ ERROR SCBA:", error.message);
    await page.screenshot({ path: 'error_scba.png', fullPage: true });
    throw error;
  } finally {
    await browser.close();
  }
}

module.exports = scrapeSCBA;
