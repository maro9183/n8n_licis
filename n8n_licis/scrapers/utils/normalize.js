function normalize(data, mapper, fecha_consulta) {
  if (!Array.isArray(data)) return [];

  const mapped = data.map(item => mapper(item, fecha_consulta));

  const cleaned = mapped.filter(item =>
    item &&
    typeof item === "object" &&
    item.numero_proceso &&
    item.numero_proceso.trim().length > 3
  );

  return cleaned;
}

module.exports = normalize;