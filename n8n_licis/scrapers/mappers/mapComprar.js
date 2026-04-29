function mapComprar(item, fecha_consulta) {
  return {
    source: "comprar",
    id:item.numero || item.numero_proceso || item.id || "",
    titulo: item.nombre || item.titulo || "",
    organismo: item.organismo || item.entidad || "",
    unidad_ejecutora: item.unidad || item.unidad_ejecutora || "",
    fecha_apertura: item.fecha || item.fecha_apertura || "",
    numero_proceso: item.numero || item.numero_proceso || item.id || "",
    tipo_proceso: item.tipo || item.tipo_proceso || "",
    estado: item.estado || "",
    monto: null,
    url: item.url || "",
    fecha_consulta: fecha_consulta || new Date().toISOString()
  };
}

module.exports = mapComprar;