function mapSaludPBA(item, fecha_consulta) {
  return {
    source: "saludpba",
    id:`${item.dependencia ?? ""}-${item.anio ?? ""}-${item.numero_orden ?? ""}-${item.llamado ?? ""}`.trim(),
    titulo: item.objeto || item.nombre || "",
    organismo: item.dependencia || item.entidad ||  "Ministerio de Salud PBA",
    unidad_ejecutora: item.dependencia || item.entidad || "",
    fecha_apertura: item.apertura || "",
    numero_proceso: `${item.dependencia ?? ""}-${item.anio ?? ""}-${item.numero_orden ?? ""}-${item.llamado ?? ""}`.trim(),
    tipo_proceso: item.tipo || "",
    estado: item.estado || "",
    monto: null,
    url: item.detalle_url || "",
    fecha_consulta: fecha_consulta || new Date().toISOString()
  };
}

module.exports = mapSaludPBA;