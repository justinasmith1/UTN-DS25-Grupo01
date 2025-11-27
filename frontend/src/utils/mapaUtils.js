// Utilidades compartidas para componentes del mapa

import { getEstadoVariant } from "../components/Table/TablaLotes/cells/StatusBadge";

/**
 * Normaliza un estado de lote para mapearlo a un "variant" visual.
 * Ejemplo: "EN_PROMOCION" -> "EN PROMOCION"
 */
export const normalizeEstadoKey = (value) => {
  if (!value) return "";
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .replace(/_/g, " ")
    .trim()
    .toUpperCase();
};

/**
 * Obtiene el estado de un lote (status || estado)
 */
export const getEstadoFromLote = (lote) => lote?.status || lote?.estado || "";

/**
 * Paleta de colores por variant (igual que en TablaLotes.css - colores del dashboard)
 * VENDIDO tiene un color amarillo brillante especial, diferente de EN PROMOCION
 */
export const getColorForVariant = (variant, estadoKey = null) => {
  // VENDIDO tiene un color amarillo brillante especial, diferente de EN PROMOCION
  if (estadoKey && String(estadoKey).toUpperCase() === "VENDIDO") {
    return "#FBBF24"; // Amarillo brillante (más claro que EN PROMOCION)
  }

  const colors = {
    success: "#18794E", // color del texto en .tl-badge--success
    warn: "#9A5C00", // color del texto en .tl-badge--warn (EN PROMOCION)
    info: "#2952CC", // color del texto en .tl-badge--info
    indigo: "#5B6BFF", // color del texto en .tl-badge--indigo
    danger: "#C23B3B", // color del texto en .tl-badge--danger
    muted: "#475467", // color del texto en .tl-badge--muted
  };
  return colors[variant] || colors.muted;
};

/**
 * Bordes más oscuros basados en los colores del dashboard
 */
export const getBorderColorForVariant = (variant, estadoKey = null) => {
  // VENDIDO tiene un borde amarillo oscuro especial
  if (estadoKey && String(estadoKey).toUpperCase() === "VENDIDO") {
    return "#D97706"; // Amarillo/naranja oscuro para borde de VENDIDO
  }

  const colors = {
    success: "#11633E", // versión más oscura de #18794E
    warn: "#7A4B00", // versión más oscura de #9A5C00 (EN PROMOCION)
    info: "#1E3A8A", // versión más oscura de #2952CC
    indigo: "#4338CA", // versión más oscura de #5B6BFF
    danger: "#991B1B", // versión más oscura de #C23B3B
    muted: "#334155", // versión más oscura de #475467
  };
  return colors[variant] || colors.muted;
};

// Re-exportar getEstadoVariant desde StatusBadge para mantener compatibilidad
export { getEstadoVariant };

const deriveFromCoordinates = (entity = {}) => {
  const hasCoords = entity?.manzana != null || entity?.numero != null;
  if (!hasCoords) return null;
  const manzana = entity.manzana ?? "?";
  const numero = entity.numero ?? "?";
  return `L${manzana}-${numero}`;
};

/**
 * Obtiene el identificador visible del lote (mapId/código) evitando usar el id interno.
 * Acepta objetos de lote, ventas, reservas u otras entidades que contengan la info anidada.
 */
export const getLoteDisplayId = (entity) => {
  if (!entity) return null;

  const direct =
    entity.mapId ??
    entity.codigo ??
    entity.identificador ??
    entity.lotMapId ??
    null;

  if (direct) return direct;

  if (entity.lote && entity.lote !== entity) {
    const nested = getLoteDisplayId(entity.lote);
    if (nested) return nested;
  }

  if (entity.loteInfo) {
    const infoId = getLoteDisplayId(entity.loteInfo);
    if (infoId) return infoId;
  }

  const derivedFromEntity = deriveFromCoordinates(entity);
  if (derivedFromEntity) return derivedFromEntity;

  if (entity.ubicacion) {
    const derivedFromUbicacion = deriveFromCoordinates(entity.ubicacion);
    if (derivedFromUbicacion) return derivedFromUbicacion;
  }

  return null;
};

