/**
 * Etapa 5.4 — Permisos finos para rol INMOBILIARIA en Documentos.
 *
 * Helpers centralizados para autorización de acceso a archivos.
 * INMOBILIARIA solo puede ver/descargar:
 * - PLANO: siempre (documentos de lote).
 * - BOLETO/ESCRITURA/OTRO: solo si venta.inmobiliariaId == user.inmobiliariaId.
 * - IMAGEN: sin cambios (no restringir en 5.4).
 * INMOBILIARIA NUNCA puede subir, editar, eliminar, restaurar, purgar.
 */

import type { TipoFile } from "../types/files.types";

export type FileAuthUser = {
  role: string;
  inmobiliariaId?: number | null;
};

export type ArchivoForAuth = {
  tipo: TipoFile;
  ventaId?: number | null;
  estadoOperativo?: string;
};

export type VentaForAuth = {
  inmobiliariaId: number | null;
};

/** Indica si el usuario tiene rol INMOBILIARIA. */
export function isInmobiliaria(user: FileAuthUser | undefined): boolean {
  return user?.role === "INMOBILIARIA";
}

/** Obtiene la inmobiliaria del usuario (para comparar con venta.inmobiliariaId). */
export function getUserInmobiliariaId(user: FileAuthUser | undefined): number | null {
  if (!user?.inmobiliariaId) return null;
  return user.inmobiliariaId;
}

/** Indica si la venta pertenece a la inmobiliaria del usuario. */
export function canInmobiliariaAccessVenta(
  user: FileAuthUser | undefined,
  venta: VentaForAuth | null
): boolean {
  if (!venta) return false;
  const userInmoId = getUserInmobiliariaId(user);
  if (userInmoId == null) return false;
  return venta.inmobiliariaId === userInmoId;
}

const TIPOS_DOC_VENTA: TipoFile[] = ["BOLETO", "ESCRITURA", "OTRO"];

/**
 * Determina si el usuario INMOBILIARIA puede acceder (ver/descargar) al archivo.
 * - Si user NO es INMOBILIARIA => true (sin restricción adicional).
 * - Si user es INMOBILIARIA:
 *   - archivo eliminado => false
 *   - PLANO => true
 *   - BOLETO/ESCRITURA/OTRO con ventaId null => false
 *   - BOLETO/ESCRITURA/OTRO con ventaId => venta debe pertenecer a la inmobiliaria del user
 *   - IMAGEN => true (NO CAMBIAR en 5.4)
 *
 * @param venta - Venta cargada (solo necesaria para BOLETO/ESCRITURA/OTRO con ventaId).
 *                Si null y se necesita, el caller debe hacer lookup.
 */
export function canUserAccessArchivo(
  user: FileAuthUser | undefined,
  archivo: ArchivoForAuth,
  venta: VentaForAuth | null
): boolean {
  if (!isInmobiliaria(user)) return true;

  if (archivo.estadoOperativo === "ELIMINADO") return false;

  if (archivo.tipo === "PLANO") return true;
  if (archivo.tipo === "IMAGEN") return true; // No cambiar en 5.4

  if (TIPOS_DOC_VENTA.includes(archivo.tipo)) {
    if (archivo.ventaId == null) return false;
    return canInmobiliariaAccessVenta(user, venta);
  }

  return true; // Tipos no contemplados: permitir por defecto (conservador)
}
