// src/components/TablaLotes/utils/getters.js
export function getPropietarioNombre(l) {
  const p = l?.propietario;
  if (!p) return l?.propietarioNombre ?? l?.ownerName ?? '—';
  if (p.nombreCompleto) return p.nombreCompleto;
  const partes = [p.nombre, p.apellido].filter(Boolean);
  if (partes.length) return partes.join(' ');
  return p.razonSocial ?? String(p.id ?? '—');
}

export function getUbicacion(l) {
  const u = l?.ubicacion;
  if (!u || !u.calle) return '—';
  const calle = u.calle ?? u.nombreCalle ?? '';
  const numero = u.numero ?? '';
  if (!calle && !numero) return '—';
  return `${calle} ${numero}`.trim();
}

export function getTipo(l) {
  const tipo = l?.tipo;
  if (!tipo) return '—';
  if (tipo === 'LOTE_VENTA' || tipo === 'Lote Venta') return 'Lote Venta';
  if (tipo === 'ESPACIO_COMUN' || tipo === 'Espacio Comun') return 'Espacio Común';
  return '—';
}

export function getFraccion(l) {
  const fraccion = l?.fraccion;
  const tipo = l?.tipo;
  // Si es espacio común, mostrar "Sin fracción"
  if (tipo === 'ESPACIO_COMUN' || tipo === 'Espacio Comun') {
    return 'Sin fracción';
  }
  if (!fraccion || fraccion.numero == null) return '—';
  return String(fraccion.numero);
}

export function getInquilino(l) {
  const i = l?.inquilino;
  if (!i) return 'Sin inquilino';
  if (i.nombreCompleto) return i.nombreCompleto;
  const partes = [i.nombre, i.apellido].filter(Boolean);
  if (partes.length) return partes.join(' ');
  return i.razonSocial ?? 'Sin inquilino';
}

export function getNumPartida(l) {
  const num = l?.numPartido ?? l?.numPartida;
  if (num == null) return '—';
  return String(num);
}

export function getLoteIdFormatted(l) {
  // Prioridad 1: usar fraccion.numero y numero (parcela) si existen para lo mismo que dice abajo
  const fraccion = l?.fraccion?.numero;
  const numeroParcela = l?.numero;
  
  if (fraccion != null && numeroParcela != null) {
    return `Lote ${fraccion}-${numeroParcela}`;
  }
  
  // Fallback: parsear mapId y reordenar, esto es en base a lo que nos pidieron ellos que es mas comodo para ellos. Si fallan los atributos lo hace con el mapId
  const mapId = l?.mapId;
  if (mapId) {
    const str = String(mapId).trim();
    // Si tiene formato "Lote20-3" o "Lote 20-3", extraer y reordenar
    const match = str.match(/^Lote\s*(\d+)-(\d+)$/i);
    if (match) {
      const [, parte1, parte2] = match;
      // Invertir: parte2 primero, parte1 segundo
      return `Lote ${parte2}-${parte1}`;
    }
    // Si no coincide el patrón, devolver tal cual
    return str;
  }
  
  return '—';
}
