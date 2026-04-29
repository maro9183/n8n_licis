const scrapePBAC = require('./sitePBAC');
const scrapeCOMPRAR = require('./siteCOMPRAR');
const scrapeSALUDPBA = require('./siteSALUDPBA');
const scrapeMPBA = require('./siteMPBA');
const scrapeSCBA = require('./siteSCBA');


const strategies = {
  pbac: scrapePBAC,
  comprar: scrapeCOMPRAR,
  saludpba: scrapeSALUDPBA,
  mpba: scrapeMPBA,
  scba: scrapeSCBA,
};

function getStrategy(source) {
  const strategy = strategies[source];

  if (!strategy) {
    throw new Error(`Fuente no soportada: ${source}`);
  }

  return strategy;
}

module.exports = getStrategy;