function mapPbac(item, fecha_consulta) {
  return {
    source: "pbac",

    titulo: item.nombre_proceso || "",
    organismo: item.unidad_ejecutora || "",
    unidad_ejecutora: "PBAC",
    fecha_apertura: item.fecha_apertura || "",
    numero_proceso: item.numero_proceso || "",
    tipo_proceso: item.tipo_proceso || "",
    estado: item.estado || "",
    monto: null,
    url: item.url || "",
    postback: item.postback || null,
    fecha_consulta: fecha_consulta || new Date().toISOString()
  };
}

module.exports = mapPbac;