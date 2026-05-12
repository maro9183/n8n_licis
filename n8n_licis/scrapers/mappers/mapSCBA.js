function mapScba(item, fecha_consulta) {
  const departamento = item.departamento || "S/D";
  const numero = item.numero || "";
  
  return {
    id: `${departamento}-${numero}`,
    source: "scba",
    titulo: item.detalle || "",
    organismo: departamento,
    unidad_ejecutora: "SCBA",
    fecha_apertura: item.apertura || "",
    numero_proceso: numero,
    tipo_proceso: numero ? (numero.split(' ')[0]) : "",
    estado: item.resuelto || "",
    monto: null,
    url: item.url || "",
    postback: null,
    fecha_consulta: fecha_consulta || new Date().toISOString()
  };
}

module.exports = mapScba;
