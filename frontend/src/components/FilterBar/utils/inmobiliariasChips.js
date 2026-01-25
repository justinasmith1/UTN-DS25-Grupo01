// src/components/FilterBar/utils/inmobiliariasChips.js
// Utilidades para formatear chips de filtros de inmobiliarias
// Sigue el patrón de Visibilidad igual que Prioridades/Reservas/Ventas

export const nice = (s) =>
  (s ?? "")
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());

export function inmobiliariasChipsFrom(applied, catalogs) {
  const arr = [];
  
  // Búsqueda general
  if (applied.q) {
    arr.push({ k: "q", label: `Buscar: ${applied.q}`, v: applied.q });
  }

  // Visibilidad (estadoOperativo) - solo mostrar si no es el default "OPERATIVO"
  // Mismo patrón que Prioridades/Reservas/Ventas
  const visibilidad = applied.visibilidad ?? applied.estadoOperativo ?? "OPERATIVO";
  // Comparar como string para evitar problemas de tipo
  if (String(visibilidad) !== "OPERATIVO") {
    const visibilidadLabel = String(visibilidad) === "ELIMINADO" ? "Eliminadas" : String(visibilidad);
    arr.push({ k: "visibilidad", v: visibilidad, label: visibilidadLabel });
  }

  // Filtros de selección múltiple (si existieran)
  (applied.nombre || []).forEach((v) => 
    arr.push({ k: "nombre", v, label: `Nombre: ${v}` })
  );
  
  (applied.razonSocial || []).forEach((v) => 
    arr.push({ k: "razonSocial", v, label: `Razón Social: ${v}` })
  );
  
  (applied.contacto || []).forEach((v) => 
    arr.push({ k: "contacto", v, label: `Contacto: ${v}` })
  );

  // Filtros de rango - Comisión x Venta
  if (applied.comxventa && (applied.comxventa.min !== null || applied.comxventa.max !== null)) {
    const min = applied.comxventa.min !== null ? applied.comxventa.min : '';
    const max = applied.comxventa.max !== null ? applied.comxventa.max : '';
    if (min && max) {
      arr.push({ k: "comxventa", v: applied.comxventa, label: `Comisión: ${min}% - ${max}%` });
    } else if (min) {
      arr.push({ k: "comxventa", v: applied.comxventa, label: `Comisión: desde ${min}%` });
    } else if (max) {
      arr.push({ k: "comxventa", v: applied.comxventa, label: `Comisión: hasta ${max}%` });
    }
  }

  // Filtros de rango - Prioridades Totales
  if (applied.prioridadesTotales && (applied.prioridadesTotales.min !== null || applied.prioridadesTotales.max !== null)) {
    const min = applied.prioridadesTotales.min !== null ? applied.prioridadesTotales.min : '';
    const max = applied.prioridadesTotales.max !== null ? applied.prioridadesTotales.max : '';
    if (min && max) {
      arr.push({ k: "prioridadesTotales", v: applied.prioridadesTotales, label: `Prioridades Totales: ${min} - ${max}` });
    } else if (min) {
      arr.push({ k: "prioridadesTotales", v: applied.prioridadesTotales, label: `Prioridades Totales: desde ${min}` });
    } else if (max) {
      arr.push({ k: "prioridadesTotales", v: applied.prioridadesTotales, label: `Prioridades Totales: hasta ${max}` });
    }
  }

  // Filtros de rango - Ventas Totales (con compatibilidad legacy cantidadVentas)
  const ventasField = applied.ventasTotales || applied.cantidadVentas;
  if (ventasField && (ventasField.min !== null || ventasField.max !== null)) {
    const min = ventasField.min !== null ? ventasField.min : '';
    const max = ventasField.max !== null ? ventasField.max : '';
    const key = applied.ventasTotales ? "ventasTotales" : "cantidadVentas";
    if (min && max) {
      arr.push({ k: key, v: ventasField, label: `Ventas Totales: ${min} - ${max}` });
    } else if (min) {
      arr.push({ k: key, v: ventasField, label: `Ventas Totales: desde ${min}` });
    } else if (max) {
      arr.push({ k: key, v: ventasField, label: `Ventas Totales: hasta ${max}` });
    }
  }

  // Filtros de rango - Reservas Totales (con compatibilidad legacy cantidadReservas)
  const reservasField = applied.reservasTotales || applied.cantidadReservas;
  if (reservasField && (reservasField.min !== null || reservasField.max !== null)) {
    const min = reservasField.min !== null ? reservasField.min : '';
    const max = reservasField.max !== null ? reservasField.max : '';
    const key = applied.reservasTotales ? "reservasTotales" : "cantidadReservas";
    if (min && max) {
      arr.push({ k: key, v: reservasField, label: `Reservas Totales: ${min} - ${max}` });
    } else if (min) {
      arr.push({ k: key, v: reservasField, label: `Reservas Totales: desde ${min}` });
    } else if (max) {
      arr.push({ k: key, v: reservasField, label: `Reservas Totales: hasta ${max}` });
    }
  }

  // Filtros de rango - Fecha de Creación
  if (applied.createdAt && (applied.createdAt.min !== null || applied.createdAt.max !== null)) {
    const minDate = applied.createdAt.min ? new Date(applied.createdAt.min).toISOString().split('T')[0] : '';
    const maxDate = applied.createdAt.max ? new Date(applied.createdAt.max).toISOString().split('T')[0] : '';
    if (minDate && maxDate) {
      arr.push({ k: "createdAt", v: applied.createdAt, label: `Creado: ${minDate} - ${maxDate}` });
    } else if (minDate) {
      arr.push({ k: "createdAt", v: applied.createdAt, label: `Creado: desde ${minDate}` });
    } else if (maxDate) {
      arr.push({ k: "createdAt", v: applied.createdAt, label: `Creado: hasta ${maxDate}` });
    }
  }

  return arr;
}
