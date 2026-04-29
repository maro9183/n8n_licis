const { chromium } = require('playwright');

async function scrapeMPBA() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const BASE_URL = 'https://mpba.gov.ar/v2021/licitaciones?p=';
  const MAX_PAGES = 100;

  let results = [];
  let seen = new Set();

  try {
    for (let i = 1; i <= MAX_PAGES; i++) {
      const url = `${BASE_URL}${i}`;
      console.log(`🌐 MPBA página ${i}`);

      await page.goto(url, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('.shadow-wrapper');

      const snapshot = await page.$$eval('.shadow-wrapper', nodes =>
        nodes.slice(0, 3).map(n => n.innerText.trim()).join('|')
      );

      if (seen.has(snapshot)) break;
      seen.add(snapshot);

      const data = await page.$$eval('.tag-box.tag-box-v4.u-shadow-v21--hover', items =>
        items.map(item => {
          const titleSpan = item.querySelector('h2.heading-sm a.link-bg-icon span')?.innerText.trim() || "";
          // Split "Contratación Directa Menor N.º 7/26" into type and number if needed, 
          // but we will mainly use titleSpan for the type extraction.
          const tipo_proceso = titleSpan.split('N.º')[0].trim();
          
          const objeto = item.querySelector('.col-md-8 .tag-box.margin-bottom-5 span')?.innerText.trim() || "";
          
          // Expediente is in the first tag-box of col-md-4
          const expedienteRaw = item.querySelector('.col-md-4 .tag-box:nth-child(1)')?.innerText || "";
          const expediente = expedienteRaw.replace(/N\.º de expediente:\s*/i, '').trim();
          
          // Fecha is in the second tag-box of col-md-4
          const fecha = item.querySelector('.col-md-4 .tag-box:nth-child(2) p b')?.innerText.trim() || "";
          
          const link = item.querySelector('h2.heading-sm a.link-bg-icon')?.getAttribute('href') || "";

          return {
            id: expediente, // Used by mapper
            titulo: objeto, // The user wants objeto in titulo
            objeto: objeto,
            expediente: expediente,
            tipo_proceso: tipo_proceso,
            numero_proceso: expediente, // The user wants expediente here too
            fecha_apertura: fecha,
            url: link ? (link.startsWith('http') ? link : `https://mpba.gov.ar${link}`) : ""
          };
        })
      );

      if (!data.length) break;

      results.push(...data);
    }

    return results;

  } finally {
    await browser.close();
  }
}

module.exports = scrapeMPBA;