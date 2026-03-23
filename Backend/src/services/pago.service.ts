// src/services/pago.service.ts
import prisma from '../config/prisma';
import type { Prisma } from '../generated/prisma';
import {
  calcularMontoFinanciado,
  calcularMontoTotalExigible,
  calcularSaldoPendiente,
  determinarEstadoCuota,
  determinarEstadoCobro,
  estaCuotaVencida,
  obtenerPrimeraCuotaPendiente,
} from '../domain/pagoState/pagoState.rules';
import {
  PLAN_INCLUDE,
  VENTA_INCLUDE_PAGOS,
  roundMoney2,
  toNum,
  type PagoUserContext,
} from './pago.shared';

type PagoConCuotaHistorica = Prisma.PagoRegistradoGetPayload<{
  include: {
    cuota: {
      select: {
        id: true;
        numeroCuota: true;
        tipoCuota: true;
        planPagoId: true;
        planPago: { select: { id: true; nombre: true; version: true } };
      };
    };
  };
}>;

/** Cuota del cronograma con montos numéricos y vencida calculada (plan vigente o histórico). */
function normalizarCuotaPlanPagoContext(
  c: {
    id: number;
    planPagoId: number;
    numeroCuota: number;
    tipoCuota: string;
    fechaVencimiento: Date;
    montoOriginal: Prisma.Decimal | number;
    montoRecargoManual: Prisma.Decimal | number;
    montoTotalExigible: Prisma.Decimal | number;
    montoPagado: Prisma.Decimal | number;
    saldoPendiente: Prisma.Decimal | number;
    estadoCuota: string;
    descripcion?: string | null;
    fechaPagoCompleto?: Date | null;
    observacion?: string | null;
    motivoRecargo?: string | null;
    recargoAplicadoBy?: string | null;
    fechaAplicacionRecargo?: Date | null;
    createdAt?: Date;
    updateAt?: Date | null;
  },
  ahora: Date
) {
  const saldo = toNum(c.saldoPendiente);
  return {
    ...c,
    montoOriginal: toNum(c.montoOriginal),
    montoRecargoManual: toNum(c.montoRecargoManual),
    montoTotalExigible: toNum(c.montoTotalExigible),
    montoPagado: toNum(c.montoPagado),
    saldoPendiente: saldo,
    estaVencida: estaCuotaVencida(c.fechaVencimiento, saldo, ahora),
  };
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

  const ahora = new Date();

  const planVigente = await prisma.planPago.findFirst({
    where: { ventaId, esVigente: true },
    include: PLAN_INCLUDE,
  });

  const cuotas = planVigente?.cuotas ?? [];
  const pagos = (await prisma.pagoRegistrado.findMany({
    where: { ventaId },
    orderBy: { fechaPago: 'desc' },
    include: {
      cuota: {
        select: {
          id: true,
          numeroCuota: true,
          tipoCuota: true,
          planPagoId: true,
          planPago: { select: { id: true, nombre: true, version: true } },
        },
      },
    },
  })) as PagoConCuotaHistorica[];

  const planesHistoricosRaw = await prisma.planPago.findMany({
    where: { ventaId, esVigente: false },
    orderBy: { version: 'desc' },
    include: PLAN_INCLUDE,
  });

  const planesHistoricos = planesHistoricosRaw.map((ph) => ({
    id: ph.id,
    nombre: ph.nombre,
    estadoPlan: ph.estadoPlan,
    tipoFinanciacion: ph.tipoFinanciacion,
    moneda: ph.moneda,
    cantidadCuotas: ph.cantidadCuotas,
    montoTotalPlanificado: toNum(ph.montoTotalPlanificado),
    montoFinanciado: toNum(ph.montoFinanciado),
    montoAnticipo: toNum(ph.montoAnticipo),
    fechaInicio: ph.fechaInicio,
    version: ph.version,
    esVigente: ph.esVigente,
    descripcion: ph.descripcion,
    observaciones: ph.observaciones,
    createdAt: ph.createdAt,
    createdBy: ph.createdBy,
    cuotas: ph.cuotas.map((c) => normalizarCuotaPlanPagoContext(c, ahora)),
  }));

  let montoTotalPagado = 0;
  let saldoPendienteTotal = 0;
  let cuotasPagas = 0;
  let cuotasPendientes = 0;
  let cuotasVencidas = 0;

  // Total pagado de la venta: todos los pagos registrados (planes anteriores siguen referenciando sus cuotas).
  montoTotalPagado = pagos.reduce((acc, p) => acc + toNum(p.monto), 0);

  for (const cuota of cuotas) {
    const saldo = toNum(cuota.saldoPendiente);
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

  const cuotasNormalizadas = cuotas.map((c) => normalizarCuotaPlanPagoContext(c, ahora));

  const planVigenteId = planVigente?.id ?? null;

  const pagosNormalizados = pagos.map((p) => {
    const { cuota, ...pagoSinCuota } = p;
    const planCuota = cuota?.planPago;
    const planPagoIdHist = planCuota?.id ?? p.planPagoId;
    const planVersionHist = planCuota?.version ?? null;
    const planNombreHist = planCuota?.nombre ?? null;

    let referenciaCuotaUi = '—';
    if (cuota) {
      const tipo = String(cuota.tipoCuota ?? '');
      const base =
        tipo.length > 0
          ? `Cuota ${cuota.numeroCuota} · ${tipo}`
          : `Cuota ${cuota.numeroCuota}`;
      const esOtroPlan =
        planVigenteId != null &&
        planPagoIdHist != null &&
        planPagoIdHist !== planVigenteId;
      referenciaCuotaUi =
        esOtroPlan && planVersionHist != null ? `${base} (v${planVersionHist})` : base;
    }

    return {
      ...pagoSinCuota,
      monto: toNum(p.monto),
      cuotaHistorica: cuota
        ? {
            cuotaId: cuota.id,
            numeroCuota: cuota.numeroCuota,
            tipoCuota: cuota.tipoCuota,
            planPagoId: planPagoIdHist,
            planVersion: planVersionHist,
            planNombre: planNombreHist,
          }
        : null,
      referenciaCuotaUi,
    };
  });

  // Visión global de la venta: planificado = ya pagado (toda la historia) + saldo del plan vigente.
  const montoTotalPlanificadoResumen = roundMoney2(montoTotalPagado + saldoPendienteTotal);

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
      montoTotalPlanificado: montoTotalPlanificadoResumen,
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

export async function createPlanPagoInicial(
  ventaId: number,
  payload: CreatePlanPayload,
  user?: PagoUserContext
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

interface RegistrarPagoPayload {
  cuotaId: number;
  fechaPago: string;
  monto: number;
  medioPago: string;
  referencia?: string;
  observacion?: string;
}

export async function registrarPagoEnVenta(
  ventaId: number,
  payload: RegistrarPagoPayload,
  user?: PagoUserContext
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

  const plan = await prisma.planPago.findFirst({
    where: { ventaId, esVigente: true },
    include: PLAN_INCLUDE,
  });

  if (!plan) {
    const error = new Error('La venta no tiene un plan de pago vigente') as any;
    error.statusCode = 409;
    throw error;
  }

  const cuota = await prisma.cuotaPlanPago.findUnique({
    where: { id: payload.cuotaId },
  });

  if (!cuota) {
    const error = new Error('Cuota no encontrada') as any;
    error.statusCode = 404;
    throw error;
  }

  if (cuota.planPagoId !== plan.id) {
    const error = new Error('La cuota indicada no pertenece al plan vigente de la venta') as any;
    error.statusCode = 409;
    throw error;
  }

  const saldoPendiente = toNum(cuota.saldoPendiente);
  if (saldoPendiente <= 0 || cuota.estadoCuota === 'PAGA') {
    const error = new Error('La cuota ya está paga o no tiene saldo pendiente') as any;
    error.statusCode = 409;
    throw error;
  }

  const cuotasParaEvaluacion = plan.cuotas.map((c) => ({
    numeroCuota: c.numeroCuota,
    fechaVencimiento: c.fechaVencimiento,
    saldoPendiente: toNum(c.saldoPendiente),
  }));
  const primeraPendiente = obtenerPrimeraCuotaPendiente(cuotasParaEvaluacion);
  if (!primeraPendiente) {
    const error = new Error('No hay cuotas pendientes de pago') as any;
    error.statusCode = 409;
    throw error;
  }
  const cuotaHabilitada = plan.cuotas.find((c) => c.numeroCuota === primeraPendiente.numeroCuota);
  if (!cuotaHabilitada || cuotaHabilitada.id !== payload.cuotaId) {
    const error = new Error('Solo puede registrarse pago sobre la primera cuota con saldo pendiente') as any;
    error.statusCode = 409;
    throw error;
  }

  if (payload.monto > saldoPendiente) {
    const error = new Error('El monto del pago supera el saldo pendiente de la cuota') as any;
    error.statusCode = 409;
    throw error;
  }

  const registradoBy = user?.email ?? null;

  const result = await prisma.$transaction(async (tx) => {
    const pagoCreado = await tx.pagoRegistrado.create({
      data: {
        ventaId,
        planPagoId: plan.id,
        cuotaId: cuota.id,
        fechaPago: new Date(payload.fechaPago),
        monto: payload.monto,
        medioPago: payload.medioPago as any,
        referencia: payload.referencia ?? null,
        observacion: payload.observacion ?? null,
        registradoBy,
      },
    });

    const montoPagadoActual = toNum(cuota.montoPagado);
    const montoTotalExigible = toNum(cuota.montoTotalExigible);
    const nuevoMontoPagado = montoPagadoActual + payload.monto;
    const nuevoSaldoPendiente = Math.max(0, montoTotalExigible - nuevoMontoPagado);
    const nuevoEstadoCuota = determinarEstadoCuota(nuevoMontoPagado, nuevoSaldoPendiente);
    const fechaPagoCompleto = nuevoSaldoPendiente <= 0 ? new Date(payload.fechaPago) : null;

    const cuotaActualizada = await tx.cuotaPlanPago.update({
      where: { id: cuota.id },
      data: {
        montoPagado: nuevoMontoPagado,
        saldoPendiente: nuevoSaldoPendiente,
        estadoCuota: nuevoEstadoCuota,
        fechaPagoCompleto,
        updateAt: new Date(),
      },
    });

    const cuotasActualizadas = await tx.cuotaPlanPago.findMany({
      where: { planPagoId: plan.id },
      orderBy: { numeroCuota: 'asc' },
    });

    let montoTotalPagado = 0;
    let saldoPendienteTotal = 0;
    let cuotasPagas = 0;
    let cuotasPendientes = 0;
    let cuotasVencidas = 0;
    const ahora = new Date();

    for (const c of cuotasActualizadas) {
      const pagado = toNum(c.montoPagado);
      const saldo = toNum(c.saldoPendiente);
      montoTotalPagado += pagado;
      saldoPendienteTotal += saldo;

      if (c.estadoCuota === 'PAGA') {
        cuotasPagas++;
      } else {
        cuotasPendientes++;
        if (estaCuotaVencida(c.fechaVencimiento, saldo, ahora)) {
          cuotasVencidas++;
        }
      }
    }

    const estadoCobro = determinarEstadoCobro(montoTotalPagado, saldoPendienteTotal);

    await tx.venta.update({
      where: { id: ventaId },
      data: { estadoCobro, updateAt: new Date() },
    });

    const cuotaHabilitadaSiguiente = obtenerPrimeraCuotaPendiente(
      cuotasActualizadas.map((c) => ({
        numeroCuota: c.numeroCuota,
        fechaVencimiento: c.fechaVencimiento,
        saldoPendiente: toNum(c.saldoPendiente),
      }))
    );
    let cuotaSiguienteNormalizada = null;
    if (cuotaHabilitadaSiguiente) {
      const cuotaSiguiente = cuotasActualizadas.find(
        (c) => c.numeroCuota === cuotaHabilitadaSiguiente.numeroCuota
      );
      if (cuotaSiguiente) {
        cuotaSiguienteNormalizada = {
          ...cuotaSiguiente,
          montoOriginal: toNum(cuotaSiguiente.montoOriginal),
          montoRecargoManual: toNum(cuotaSiguiente.montoRecargoManual),
          montoTotalExigible: toNum(cuotaSiguiente.montoTotalExigible),
          montoPagado: toNum(cuotaSiguiente.montoPagado),
          saldoPendiente: toNum(cuotaSiguiente.saldoPendiente),
        };
      }
    }

    return {
      pago: { ...pagoCreado, monto: toNum(pagoCreado.monto) },
      cuota: {
        ...cuotaActualizada,
        montoOriginal: toNum(cuotaActualizada.montoOriginal),
        montoRecargoManual: toNum(cuotaActualizada.montoRecargoManual),
        montoTotalExigible: toNum(cuotaActualizada.montoTotalExigible),
        montoPagado: toNum(cuotaActualizada.montoPagado),
        saldoPendiente: toNum(cuotaActualizada.saldoPendiente),
      },
      resumen: {
        montoTotalPagado,
        saldoPendienteTotal,
        cuotasPagas,
        cuotasPendientes,
        cuotasVencidas,
        estadoCobro,
      },
      cuotaHabilitadaSiguiente: cuotaSiguienteNormalizada,
    };
  });

  return result;
}

interface AplicarRecargoPayload {
  cuotaId: number;
  montoRecargo: number;
}

export async function aplicarRecargoManualEnVenta(
  ventaId: number,
  payload: AplicarRecargoPayload,
  user?: PagoUserContext
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

  const plan = await prisma.planPago.findFirst({
    where: { ventaId, esVigente: true },
    include: PLAN_INCLUDE,
  });

  if (!plan) {
    const error = new Error('La venta no tiene un plan de pago vigente') as any;
    error.statusCode = 409;
    throw error;
  }

  const cuota = await prisma.cuotaPlanPago.findUnique({
    where: { id: payload.cuotaId },
  });

  if (!cuota) {
    const error = new Error('Cuota no encontrada') as any;
    error.statusCode = 404;
    throw error;
  }

  if (cuota.planPagoId !== plan.id) {
    const error = new Error('La cuota indicada no pertenece al plan vigente de la venta') as any;
    error.statusCode = 409;
    throw error;
  }

  const saldoAntes = toNum(cuota.saldoPendiente);
  if (saldoAntes <= 0 || cuota.estadoCuota === 'PAGA') {
    const error = new Error('La cuota ya está paga o no tiene saldo pendiente') as any;
    error.statusCode = 409;
    throw error;
  }

  const ahora = new Date();
  if (!estaCuotaVencida(cuota.fechaVencimiento, saldoAntes, ahora)) {
    const error = new Error('Solo se puede aplicar recargo a una cuota vencida con saldo pendiente') as any;
    error.statusCode = 409;
    throw error;
  }

  const montoOriginal = toNum(cuota.montoOriginal);
  const montoPagado = toNum(cuota.montoPagado);
  const recargoPrevio = toNum(cuota.montoRecargoManual);
  const nuevoMontoRecargoManual = recargoPrevio + payload.montoRecargo;
  const montoTotalExigible = calcularMontoTotalExigible(montoOriginal, nuevoMontoRecargoManual);
  const nuevoSaldoPendiente = calcularSaldoPendiente(montoTotalExigible, montoPagado);
  const nuevoEstadoCuota = determinarEstadoCuota(montoPagado, nuevoSaldoPendiente);

  const recargoAplicadoBy = user?.email ?? null;

  await prisma.$transaction(async (tx) => {
    await tx.cuotaPlanPago.update({
      where: { id: cuota.id },
      data: {
        montoRecargoManual: nuevoMontoRecargoManual,
        montoTotalExigible,
        saldoPendiente: nuevoSaldoPendiente,
        estadoCuota: nuevoEstadoCuota,
        recargoAplicadoBy,
        fechaAplicacionRecargo: ahora,
        updateAt: ahora,
      },
    });

    const cuotasActualizadas = await tx.cuotaPlanPago.findMany({
      where: { planPagoId: plan.id },
      orderBy: { numeroCuota: 'asc' },
    });

    let montoTotalPagado = 0;
    let saldoPendienteTotal = 0;
    const ref = new Date();

    for (const c of cuotasActualizadas) {
      const pagado = toNum(c.montoPagado);
      const saldo = toNum(c.saldoPendiente);
      montoTotalPagado += pagado;
      saldoPendienteTotal += saldo;
    }

    let cuotasPagas = 0;
    let cuotasPendientes = 0;
    let cuotasVencidas = 0;

    for (const c of cuotasActualizadas) {
      const saldo = toNum(c.saldoPendiente);
      if (c.estadoCuota === 'PAGA') {
        cuotasPagas++;
      } else {
        cuotasPendientes++;
        if (estaCuotaVencida(c.fechaVencimiento, saldo, ref)) {
          cuotasVencidas++;
        }
      }
    }

    const estadoCobro = determinarEstadoCobro(montoTotalPagado, saldoPendienteTotal);

    await tx.venta.update({
      where: { id: ventaId },
      data: { estadoCobro, updateAt: ref },
    });
  });
}

export { reemplazarPlanPagoVigente } from './pagoPlanReemplazo.service';
