function mapScba(item, fecha_consulta) {
  return {
    id: item.numero || "",
    source: "scba",
    titulo: item.detalle || "",
    organismo: item.departamento || "SUPREMA CORTE",
    unidad_ejecutora: "SCBA",
    fecha_apertura: item.apertura || "",
    numero_proceso: item.numero || "",
    tipo_proceso: item.numero ? (item.numero.split(' ')[0]) : "",
    estado: item.resuelto || "",
    monto: null,
    url: item.url || "",
    postback: null,
    fecha_consulta: fecha_consulta || new Date().toISOString()
  };
}

module.exports = mapScba;
