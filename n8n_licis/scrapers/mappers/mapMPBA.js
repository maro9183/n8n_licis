function mapMpba(item, fecha_consulta) {
  return {
    id: item.id || "",
    source: "mpba",
    titulo: item.titulo || "",
    organismo: "Ministerio Público (MPBA)",
    unidad_ejecutora: "MPBA",
    fecha_apertura: item.fecha_apertura || "",
    numero_proceso: item.numero_proceso || "",
    tipo_proceso: item.tipo_proceso || "",
    estado: item.estado || "",
    monto: null,
    url: item.url || "",
    postback: null,
    fecha_consulta: fecha_consulta || new Date().toISOString()
  };
}

module.exports = mapMpba;
