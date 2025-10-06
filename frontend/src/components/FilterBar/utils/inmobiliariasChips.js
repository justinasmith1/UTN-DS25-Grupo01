// src/components/FilterBar/utils/inmobiliariasChips.js
// Utilidades para formatear chips de filtros de inmobiliarias

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

  // Filtros de selección múltiple
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

  // Filtros de rango - Cantidad de Ventas
  if (applied.cantidadVentas && (applied.cantidadVentas.min !== null || applied.cantidadVentas.max !== null)) {
    const min = applied.cantidadVentas.min !== null ? applied.cantidadVentas.min : '';
    const max = applied.cantidadVentas.max !== null ? applied.cantidadVentas.max : '';
    if (min && max) {
      arr.push({ k: "cantidadVentas", v: applied.cantidadVentas, label: `Ventas: ${min} - ${max}` });
    } else if (min) {
      arr.push({ k: "cantidadVentas", v: applied.cantidadVentas, label: `Ventas: desde ${min}` });
    } else if (max) {
      arr.push({ k: "cantidadVentas", v: applied.cantidadVentas, label: `Ventas: hasta ${max}` });
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
