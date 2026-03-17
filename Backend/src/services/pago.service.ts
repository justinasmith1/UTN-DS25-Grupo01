// src/services/pago.service.ts
import prisma from '../config/prisma';
import { Decimal } from '../generated/prisma/runtime/library';
import {
  calcularMontoFinanciado,
  estaCuotaVencida,
} from '../domain/pagoState/pagoState.rules';

const VENTA_INCLUDE_PAGOS = {
  lote: { select: { id: true, numero: true, fraccion: { select: { numero: true } } } },
  comprador: { select: { id: true, nombre: true, apellido: true, razonSocial: true } },
  compradores: { select: { id: true, nombre: true, apellido: true, razonSocial: true } },
  inmobiliaria: { select: { id: true, nombre: true } },
} as const;

const PLAN_INCLUDE = {
  cuotas: { orderBy: { numeroCuota: 'asc' as const } },
} as const;

function toNum(val: Decimal | number): number {
  return typeof val === 'number' ? val : val.toNumber();
}

export async function getPagosContextByVentaId(ventaId: number) {
  const venta = await prisma.venta.findUnique({
    where: { id: ventaId },
    include: VENTA_INCLUDE_PAGOS,
  });

  if (!venta) {
    const error = new Error('Venta no encontrada') as any;
    error.statusCode = 404;
    throw error;
  }

  if (venta.estadoOperativo === 'ELIMINADO') {
    const error = new Error('La venta está eliminada') as any;
    error.statusCode = 409;
    throw error;
  }

  const planVigente = await prisma.planPago.findFirst({
    where: { ventaId, esVigente: true },
    include: PLAN_INCLUDE,
  });

  const cuotas = planVigente?.cuotas ?? [];
  const pagos = await prisma.pagoRegistrado.findMany({
    where: { ventaId },
    orderBy: { fechaPago: 'desc' },
  });

  const planesHistoricos = await prisma.planPago.findMany({
    where: { ventaId, esVigente: false },
    orderBy: { version: 'desc' },
  });

  const ahora = new Date();
  let montoTotalPlanificado = 0;
  let montoTotalPagado = 0;
  let saldoPendienteTotal = 0;
  let cuotasPagas = 0;
  let cuotasPendientes = 0;
  let cuotasVencidas = 0;

  if (planVigente) {
    montoTotalPlanificado = toNum(planVigente.montoTotalPlanificado);
  }

  for (const cuota of cuotas) {
    const pagado = toNum(cuota.montoPagado);
    const saldo = toNum(cuota.saldoPendiente);
    montoTotalPagado += pagado;
    saldoPendienteTotal += saldo;

    if (cuota.estadoCuota === 'PAGA') {
      cuotasPagas++;
    } else {
      cuotasPendientes++;
      if (estaCuotaVencida(cuota.fechaVencimiento, saldo, ahora)) {
        cuotasVencidas++;
      }
    }
  }

  const cuotasNormalizadas = cuotas.map((c) => ({
    ...c,
    montoOriginal: toNum(c.montoOriginal),
    montoRecargoManual: toNum(c.montoRecargoManual),
    montoTotalExigible: toNum(c.montoTotalExigible),
    montoPagado: toNum(c.montoPagado),
    saldoPendiente: toNum(c.saldoPendiente),
  }));

  const pagosNormalizados = pagos.map((p) => ({
    ...p,
    monto: toNum(p.monto),
  }));

  return {
    venta: {
      id: venta.id,
      numero: venta.numero,
      fechaVenta: venta.fechaVenta,
      monto: toNum(venta.monto),
      estado: venta.estado,
      estadoCobro: venta.estadoCobro,
      lote: venta.lote,
      comprador: venta.comprador,
      compradores: venta.compradores,
      inmobiliaria: venta.inmobiliaria,
    },
    planVigente: planVigente ? {
      id: planVigente.id,
      nombre: planVigente.nombre,
      estadoPlan: planVigente.estadoPlan,
      tipoFinanciacion: planVigente.tipoFinanciacion,
      moneda: planVigente.moneda,
      cantidadCuotas: planVigente.cantidadCuotas,
      montoTotalPlanificado: toNum(planVigente.montoTotalPlanificado),
      montoFinanciado: toNum(planVigente.montoFinanciado),
      montoAnticipo: toNum(planVigente.montoAnticipo),
      fechaInicio: planVigente.fechaInicio,
      version: planVigente.version,
      descripcion: planVigente.descripcion,
      observaciones: planVigente.observaciones,
      createdAt: planVigente.createdAt,
      createdBy: planVigente.createdBy,
    } : null,
    cuotas: cuotasNormalizadas,
    pagos: pagosNormalizados,
    planesHistoricos,
    resumen: {
      montoTotalPlanificado,
      montoTotalPagado,
      saldoPendienteTotal,
      cantidadCuotas: cuotas.length,
      cuotasPagas,
      cuotasPendientes,
      cuotasVencidas,
    },
  };
}

interface CreatePlanPayload {
  nombre: string;
  tipoFinanciacion: string;
  moneda: string;
  cantidadCuotas: number;
  montoTotalPlanificado: number;
  fechaInicio: string;
  cuotas: {
    numeroCuota: number;
    tipoCuota: string;
    fechaVencimiento: string;
    montoOriginal: number;
    descripcion?: string;
  }[];
  descripcion?: string;
  montoAnticipo?: number;
  observaciones?: string;
}

interface UserContext {
  email?: string;
  role?: string;
}

export async function createPlanPagoInicial(
  ventaId: number,
  payload: CreatePlanPayload,
  user?: UserContext
) {
  const venta = await prisma.venta.findUnique({
    where: { id: ventaId },
    select: { id: true, estadoOperativo: true },
  });

  if (!venta) {
    const error = new Error('Venta no encontrada') as any;
    error.statusCode = 404;
    throw error;
  }

  if (venta.estadoOperativo === 'ELIMINADO') {
    const error = new Error('La venta está eliminada') as any;
    error.statusCode = 409;
    throw error;
  }

  const planExistente = await prisma.planPago.findFirst({
    where: { ventaId, esVigente: true },
    select: { id: true },
  });

  if (planExistente) {
    const error = new Error('La venta ya tiene un plan de pago vigente') as any;
    error.statusCode = 409;
    throw error;
  }

  const anticipo = payload.montoAnticipo ?? 0;
  const montoFinanciado = calcularMontoFinanciado(payload.montoTotalPlanificado, anticipo);
  const createdBy = user?.email ?? null;

  const result = await prisma.$transaction(async (tx) => {
    const plan = await tx.planPago.create({
      data: {
        ventaId,
        nombre: payload.nombre,
        estadoPlan: 'VIGENTE',
        tipoFinanciacion: payload.tipoFinanciacion as any,
        moneda: payload.moneda as any,
        cantidadCuotas: payload.cantidadCuotas,
        montoTotalPlanificado: payload.montoTotalPlanificado,
        montoFinanciado,
        montoAnticipo: anticipo,
        fechaInicio: new Date(payload.fechaInicio),
        version: 1,
        esVigente: true,
        descripcion: payload.descripcion ?? null,
        observaciones: payload.observaciones ?? null,
        createdBy,
      },
    });

    const cuotasData = payload.cuotas.map((c) => ({
      planPagoId: plan.id,
      numeroCuota: c.numeroCuota,
      tipoCuota: c.tipoCuota as any,
      fechaVencimiento: new Date(c.fechaVencimiento),
      montoOriginal: c.montoOriginal,
      montoRecargoManual: 0,
      montoTotalExigible: c.montoOriginal,
      montoPagado: 0,
      saldoPendiente: c.montoOriginal,
      estadoCuota: 'PENDIENTE' as const,
      descripcion: c.descripcion ?? null,
    }));

    await tx.cuotaPlanPago.createMany({ data: cuotasData });

    return tx.planPago.findUnique({
      where: { id: plan.id },
      include: PLAN_INCLUDE,
    });
  });

  return result;
}
