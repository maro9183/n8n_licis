const express = require("express");

const getStrategy = require("./strategies");

const mapComprar = require("./mappers/mapComprar");
const mapPbac = require("./mappers/mapPbac");
const mapSaludPBA = require("./mappers/mapSaludPBA");
const mapMPBA = require("./mappers/mapMPBA");
const mapSCBA = require("./mappers/mapSCBA");

const normalize = require("./utils/normalize");

const app = express();
const PORT = process.env.SCRAPER_PORT || 5050;

// 🔐 API KEY desde entorno
const API_KEY = process.env.API_KEY ;

// 🧠 Mappers centralizados
const mappers = {
  comprar: mapComprar,
  pbac: mapPbac,
  saludpba: mapSaludPBA,
  mpba: mapMPBA,
  scba: mapSCBA
};

// ⏱️ Timeout de seguridad por fuente en source=all (ms)
// En source individual NO se aplica timeout — Express no tiene límite propio.
const SOURCE_TIMEOUTS = {
  comprar:  15 * 60 * 1000,  // 15 min
  pbac:     15 * 60 * 1000,  // 15 min
  saludpba:  5 * 60 * 1000,
  mpba:      5 * 60 * 1000,
  scba:      5 * 60 * 1000,
  default:   5 * 60 * 1000,
};

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Timeout")), ms)
    )
  ]);
}

// Evitar timeout de Express para rutas largas
app.use((req, res, next) => {
  res.setTimeout(0);  // Sin límite en Express
  next();
});

// 🔐 Middleware simple
app.use((req, res, next) => {
  const apiKey = req.headers["x-api-key"];

  if (apiKey !== API_KEY) {
    return res.status(403).json({ error: "Unauthorized" });
  }

  next();
});

// 🚀 Endpoint principal
app.get("/scrape", async (req, res) => {
  const source = req.query.source;

  // 🛑 Validaciones
  if (!source) {
    return res.status(400).json({ error: "source requerido" });
  }

  if (source !== "all" && !mappers[source]) {
    return res.status(400).json({ error: `source inválido: ${source}` });
  }

  try {
    // ⏱️ Timestamp único para toda la consulta
    const fecha_consulta = new Date().toISOString();

    // 🔹 SOURCE = ALL — ejecución SECUENCIAL para evitar cruce de logs y contención de RAM
    if (source === "all") {
      const sources = Object.keys(mappers);
      const flatResults = [];

      for (const src of sources) {
        console.log(`\n━━━ Iniciando ${src.toUpperCase()} ━━━`);
        const strategy = getStrategy(src);
        const mapper = mappers[src];
        const timeoutMs = SOURCE_TIMEOUTS[src] || SOURCE_TIMEOUTS.default;
        const start = Date.now();

        let data;
        try {
          data = await withTimeout(strategy(), timeoutMs);
        } catch (err) {
          console.error(`❌ ERROR en ${src}: ${err.message} — continuando con siguiente fuente`);
          continue;  // fuente fallida → saltar, no romper el flujo
        }

        console.log(`⏱️ ${src}: ${Date.now() - start}ms`);

        if (!Array.isArray(data)) {
          console.error(`Strategy ${src} no devolvió array`);
          continue;
        }

        console.log(`✅ ${src}: ${data.length} registros`);
        flatResults.push(...normalize(data, mapper, fecha_consulta));
      }

      // 🔍 DEBUG items rotos
      const rotos = flatResults.filter(r => !r || !r.numero_proceso);
      if (rotos.length) console.warn(`⚠️ Items sin numero_proceso: ${rotos.length}`);

      console.log(`\n🎯 TOTAL REGISTROS: ${flatResults.length}`);
      return res.json(flatResults);
    }

    // 🔹 SOURCE INDIVIDUAL — sin timeout de servidor, el scraper controla su propio flujo
    const strategy = getStrategy(source);
    const mapper = mappers[source];
    const start = Date.now();

    let data;
    try {
      data = await strategy();  // Sin withTimeout — deja que el scraper corra hasta completar
    } catch (scraperErr) {
      console.error(`❌ Scraper ${source} falló:`, scraperErr.message);
      // Si el scraper devolvió resultados parciales antes de fallar, no llegamos aquí.
      // Solo llegamos si el scraper no pudo recopilar nada.
      return res.json([]);
    }

    console.log(`⏱️ ${source}: ${Date.now() - start}ms`);

    if (!Array.isArray(data)) {
      console.error(`Strategy ${source} no devolvió array`, data);
      return res.json([]);
    }

    console.log(`✅ ${source}: ${data.length} registros`);
    return res.json(normalize(data, mapper, fecha_consulta));

  } catch (err) {
    console.error("❌ ERROR GLOBAL:", err.message);
    return res.status(500).json({ error: err.message });
  }
});

// 🟢 Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// 🚀 Start server
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Scraper corriendo en puerto ${PORT}`);
});