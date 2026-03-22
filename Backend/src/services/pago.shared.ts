// Constantes y utilidades compartidas del submódulo Pagos (evita inflar pago.service.ts)
import { Decimal } from '../generated/prisma/runtime/library';

export const VENTA_INCLUDE_PAGOS = {
  lote: { select: { id: true, numero: true, fraccion: { select: { numero: true } } } },
  comprador: { select: { id: true, nombre: true, apellido: true, razonSocial: true } },
  compradores: { select: { id: true, nombre: true, apellido: true, razonSocial: true } },
  inmobiliaria: { select: { id: true, nombre: true } },
} as const;

export const PLAN_INCLUDE = {
  cuotas: { orderBy: { numeroCuota: 'asc' as const } },
} as const;

export function toNum(val: Decimal | number): number {
  return typeof val === 'number' ? val : val.toNumber();
}

export function roundMoney2(n: number): number {
  return Math.round(n * 100) / 100;
}

export type PagoUserContext = {
  email?: string;
  role?: string;
};
