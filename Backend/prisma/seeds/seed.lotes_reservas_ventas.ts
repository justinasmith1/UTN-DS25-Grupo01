/**
 * Seed para Lotes, Reservas y Ventas
 * Requiere que se hayan ejecutado previamente:
 * 1. seed.users_inmobiliarias.ts (IDs fijos)
 * 2. seed-personas.ts (IDs dinámicos, pero DNI constante)
 * 
 * Comando: SEED_RESET=1 npm run seed:lrv
 */

import { 
  PrismaClient, 
  EstadoLote, 
  EstadoReserva, 
  EstadoVenta, 
  EstadoCobro, 
  TipoLote,
  NombreCalle,
  SubestadoLote,
  EstadoPrioridad,
  OwnerPrioridad
} from "../../src/generated/prisma";
import dotenv from "dotenv";

dotenv.config();

const prisma = new PrismaClient();

// Helper para buscar Persona por identificador (ya que el ID puede variar)
async function findPersonaByDNI(dni: string) {
  const persona = await prisma.persona.findFirst({
    where: { identificadorValor: dni },
  });
  if (!persona) throw new Error(`Persona con DNI ${dni} no encontrada. Ejecuta seed-personas.ts primero.`);
  return persona;
}

// Inmobiliarias (IDs fijos según seed.users_inmobiliarias.ts)
const INMOBILIARIAS = {
  GIANFELICE: 8,  // userId 8 -> Inmobiliaria (buscaremos su id real)
  ANDINOLFI: 9,   // userId 9
  AZCARATE: 12,   // userId 12
  SPINOSA: 15,    // userId 15
};

async function getInmobiliariaIdByUserId(userId: number) {
  const inmob = await prisma.inmobiliaria.findUnique({
    where: { userId },
  });
  if (!inmob) throw new Error(`Inmobiliaria con userId ${userId} no encontrada.`);
  return inmob.id;
}

async function main() {
  console.log("\n=== INICIANDO SEED: Lotes, Reservas, Ventas ===\n");

  const shouldReset = process.env.SEED_RESET === "1";

  if (shouldReset) {
    console.log("⚠️  SEED_RESET=1: Borrando Ventas, Reservas y Lotes existentes...");
    // Borrar en orden inverso a dependencias
    await prisma.prioridad.deleteMany({});
    await prisma.venta.deleteMany({});
    await prisma.reserva.deleteMany({});
    await prisma.lote.deleteMany({});
    await prisma.fraccion.deleteMany({});
    console.log("✅ Datos borrados.\n");
  }

  // 1. Obtener IDs reales de Inmobiliarias
  const idGianfelice = await getInmobiliariaIdByUserId(INMOBILIARIAS.GIANFELICE);
  const idAndinolfi = await getInmobiliariaIdByUserId(INMOBILIARIAS.ANDINOLFI);
  const idSpinosa = await getInmobiliariaIdByUserId(INMOBILIARIAS.SPINOSA);

  // 2. Obtener Personas (Clientes)
  const clienteJuan = await findPersonaByDNI("12345678"); // Juan Pérez
  const clienteMaria = await findPersonaByDNI("23456789"); // María González
  const clienteRoberto = await findPersonaByDNI("56789012"); // Roberto García (cliente de Gianfelice)

  // 3. Crear Fracción (Usaremos Fracción 3 para coincidir con el mapa visualmente)
  const fraccion3 = await prisma.fraccion.create({
    data: {
      numero: 3,
    },
  });
  console.log(`✓ Fracción 3 creada (ID: ${fraccion3.id})`);

  // 4. Crear Lotes
  console.log("\n📝 Creando Lotes...");

  // Lote 1: DISPONIBLE
  const lote1 = await prisma.lote.create({
    data: {
      numero: 1, 
      mapId: "Lote1-3", // ID del SVG
      tipo: TipoLote.LOTE_VENTA, 
      subestado: SubestadoLote.NO_CONSTRUIDO,
      superficie: 300,
      precio: 15000.00,
      estado: EstadoLote.DISPONIBLE,
      fraccionId: fraccion3.id,
      propietarioId: clienteJuan.id, 
      ubicacion: {
        create: {
          calle: NombreCalle.REINAMORA, 
          numero: 101,
        }
      }
    },
  });
  console.log(`  ✓ Lote 1 (Disponible) - mapId: Lote1-3`);

  // Lote 2: RESERVADO (por María)
  const lote2 = await prisma.lote.create({
    data: {
      numero: 2,
      mapId: "Lote2-3", // ID del SVG
      tipo: TipoLote.LOTE_VENTA,
      superficie: 350,
      precio: 18000.00,
      estado: EstadoLote.RESERVADO,
      fraccionId: fraccion3.id,
      propietarioId: clienteJuan.id,
      ubicacion: {
        create: {
          calle: NombreCalle.REINAMORA,
          numero: 102,
        }
      }
    },
  });
  console.log(`  ✓ Lote 2 (Reservado) - mapId: Lote2-3`);

  // Crear Reserva para Lote 2
  await prisma.reserva.create({
    data: {
      numero: `RES-${lote2.id}-001`,
      fechaReserva: new Date(),
      estado: EstadoReserva.ACTIVA,
      loteId: lote2.id,
      clienteId: clienteMaria.id,
      inmobiliariaId: idAndinolfi,
      sena: 1000.00,
      fechaFinReserva: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // +7 días
      loteEstadoAlCrear: EstadoLote.DISPONIBLE,
    },
  });
  console.log(`    -> Reserva creada para Lote 2 (Cliente: María)`);

  // Lote 3: VENDIDO (a Roberto)
  const lote3 = await prisma.lote.create({
    data: {
      numero: 3,
      mapId: "Lote3-3", // ID del SVG
      tipo: TipoLote.LOTE_VENTA,
      superficie: 400,
      precio: 20000.00,
      estado: EstadoLote.VENDIDO,
      fraccionId: fraccion3.id,
      propietarioId: clienteRoberto.id, // El propietario ya es Roberto
      ubicacion: {
        create: {
          calle: NombreCalle.ZORZAL,
          numero: 201,
        }
      }
    },
  });
  console.log(`  ✓ Lote 3 (Vendido) - mapId: Lote3-3`);

  // Crear Reserva consumida (histórica)
  const reservaLote3 = await prisma.reserva.create({
    data: {
      numero: `RES-${lote3.id}-HIST`,
      fechaReserva: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Hace 30 días
      estado: EstadoReserva.ACEPTADA,
      loteId: lote3.id,
      clienteId: clienteRoberto.id,
      inmobiliariaId: idGianfelice,
      sena: 2000.00,
      loteEstadoAlCrear: EstadoLote.DISPONIBLE,
      // ventaId se conectará después
    },
  });

  // Crear Venta para Lote 3
  const venta = await prisma.venta.create({
    data: {
      numero: `VEN-${lote3.id}-001`,
      loteId: lote3.id,
      fechaVenta: new Date(),
      monto: 20000.00,
      estado: EstadoVenta.ESCRITURADO, // Corregido: Enum válido
      estadoCobro: EstadoCobro.COMPLETADA, // Corregido: Enum válido
      tipoPago: "CONTADO",
      compradorId: clienteRoberto.id,
      inmobiliariaId: idGianfelice,
    },
  });

  // Conectar reserva a venta
  await prisma.reserva.update({
    where: { id: reservaLote3.id },
    data: { ventaId: venta.id }
  });
  
  console.log(`    -> Venta y Reserva consumida creadas para Lote 3 (Comprador: Roberto)`);

  // Lote 4: CON PRIORIDAD (Spinosa)
  const lote4 = await prisma.lote.create({
    data: {
      numero: 4,
      mapId: "Lote4-3", // ID del SVG
      tipo: TipoLote.LOTE_VENTA,
      subestado: SubestadoLote.NO_CONSTRUIDO,
      superficie: 450,
      precio: 22000.00,
      estado: EstadoLote.CON_PRIORIDAD,
      fraccionId: fraccion3.id,
      propietarioId: clienteJuan.id,
      ubicacion: {
        create: {
          calle: NombreCalle.CALANDRIA,
          numero: 301,
        }
      }
    },
  });
  console.log(`  ✓ Lote 4 (Con Prioridad) - mapId: Lote4-3`);

  // Crear Prioridad para Lote 4
  await prisma.prioridad.create({
    data: {
      numero: `PRI-${lote4.id}-001`,
      loteId: lote4.id,
      estado: EstadoPrioridad.ACTIVA,
      ownerType: OwnerPrioridad.INMOBILIARIA,
      inmobiliariaId: idSpinosa,
      fechaInicio: new Date(),
      fechaFin: new Date(Date.now() + 48 * 60 * 60 * 1000), // +48hs
      loteEstadoAlCrear: EstadoLote.DISPONIBLE,
    }
  });
  console.log(`    -> Prioridad creada para Lote 4 (Inmobiliaria: Spinosa)\n`);

  // ==========================================
  // ESCENARIOS PARA FLUJO DE VENTAS AMPLIADO
  // ==========================================

  console.log("\n📝 Creando Lotes Adicionales para Flujos de Venta...");

  // Lote 5: DISPONIBLE con PROMOCION
  const lote5 = await prisma.lote.create({
    data: {
      numero: 5, mapId: "Lote5-3", tipo: TipoLote.LOTE_VENTA, subestado: SubestadoLote.NO_CONSTRUIDO,
      superficie: 320, precio: 16000.00, estado: EstadoLote.EN_PROMOCION, fraccionId: fraccion3.id,
      propietarioId: clienteJuan.id,
      ubicacion: { create: { calle: NombreCalle.REINAMORA, numero: 105 } }
    }
  });
  await prisma.promocion.create({
    data: {
      loteId: lote5.id, precioAnterior: 16000.00, precioPromocional: 14500.00,
      estadoAnterior: EstadoLote.DISPONIBLE, inicio: new Date(), activa: true, explicacion: "Promo Verano"
    }
  });
  console.log(`  ✓ Lote 5 (En Promoción) - mapId: Lote5-3`);

  // Lote 6: NO DISPONIBLE
  const lote6 = await prisma.lote.create({
    data: {
      numero: 6, mapId: "Lote6-3", tipo: TipoLote.LOTE_VENTA, subestado: SubestadoLote.NO_CONSTRUIDO,
      superficie: 330, precio: 16500.00, estado: EstadoLote.NO_DISPONIBLE, fraccionId: fraccion3.id,
      propietarioId: clienteJuan.id,
      ubicacion: { create: { calle: NombreCalle.REINAMORA, numero: 106 } }
    }
  });
  console.log(`  ✓ Lote 6 (No Disponible) - mapId: Lote6-3`);

  // Lote 7: DISPONIBLE (Con Reserva Cancelada Histórica)
  const lote7 = await prisma.lote.create({
    data: {
      numero: 7, mapId: "Lote7-3", tipo: TipoLote.LOTE_VENTA, subestado: SubestadoLote.NO_CONSTRUIDO,
      superficie: 340, precio: 17000.00, estado: EstadoLote.DISPONIBLE, fraccionId: fraccion3.id,
      propietarioId: clienteJuan.id,
      ubicacion: { create: { calle: NombreCalle.REINAMORA, numero: 107 } }
    }
  });
  await prisma.reserva.create({
    data: {
      numero: `RES-${lote7.id}-CANC`, fechaReserva: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
      estado: EstadoReserva.CANCELADA, loteId: lote7.id, clienteId: clienteMaria.id, inmobiliariaId: idAndinolfi,
      sena: 500.00, loteEstadoAlCrear: EstadoLote.DISPONIBLE, fechaFinReserva: new Date(Date.now() - 53 * 24 * 60 * 60 * 1000)
    }
  });
  console.log(`  ✓ Lote 7 (Disponible / Reserva Cancelada) - mapId: Lote7-3`);

  // Lote 8: DISPONIBLE (Con Reserva Expirada Histórica)
  const lote8 = await prisma.lote.create({
    data: {
      numero: 8, mapId: "Lote8-3", tipo: TipoLote.LOTE_VENTA, subestado: SubestadoLote.NO_CONSTRUIDO,
      superficie: 350, precio: 17500.00, estado: EstadoLote.DISPONIBLE, fraccionId: fraccion3.id,
      propietarioId: clienteJuan.id,
      ubicacion: { create: { calle: NombreCalle.REINAMORA, numero: 108 } }
    }
  });
  await prisma.reserva.create({
    data: {
      numero: `RES-${lote8.id}-EXP`, fechaReserva: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      estado: EstadoReserva.EXPIRADA, loteId: lote8.id, clienteId: clienteRoberto.id, inmobiliariaId: idGianfelice,
      sena: 500.00, loteEstadoAlCrear: EstadoLote.DISPONIBLE, fechaFinReserva: new Date(Date.now() - 23 * 24 * 60 * 60 * 1000)
    }
  });
  console.log(`  ✓ Lote 8 (Disponible / Reserva Expirada) - mapId: Lote8-3`);

  // Lote 9: RESERVADO (En Contraoferta)
  const lote9 = await prisma.lote.create({
    data: {
      numero: 9, mapId: "Lote9-3", tipo: TipoLote.LOTE_VENTA, subestado: SubestadoLote.NO_CONSTRUIDO,
      superficie: 360, precio: 18000.00, estado: EstadoLote.RESERVADO, fraccionId: fraccion3.id,
      propietarioId: clienteJuan.id,
      ubicacion: { create: { calle: NombreCalle.REINAMORA, numero: 109 } }
    }
  });
  await prisma.reserva.create({
    data: {
      numero: `RES-${lote9.id}-CONT`, fechaReserva: new Date(),
      estado: EstadoReserva.CONTRAOFERTA, loteId: lote9.id, clienteId: clienteMaria.id, inmobiliariaId: idAndinolfi,
      sena: 1200.00, loteEstadoAlCrear: EstadoLote.DISPONIBLE, fechaFinReserva: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000)
    }
  });
  console.log(`  ✓ Lote 9 (Reservado / Contraoferta) - mapId: Lote9-3`);

  // Lote 10: VENDIDO (Venta Iniciada - Sin escritura ni boleto aun)
  const lote10 = await prisma.lote.create({
    data: {
      numero: 10, mapId: "Lote10-3", tipo: TipoLote.LOTE_VENTA, subestado: SubestadoLote.NO_CONSTRUIDO,
      superficie: 370, precio: 18500.00, estado: EstadoLote.VENDIDO, fraccionId: fraccion3.id,
      propietarioId: clienteJuan.id, // Sigue siendo Juan hasta que se escriture
      ubicacion: { create: { calle: NombreCalle.REINAMORA, numero: 110 } }
    }
  });
  await prisma.venta.create({
    data: {
      numero: `VEN-${lote10.id}-INI`, loteId: lote10.id, fechaVenta: new Date(), monto: 18500.00,
      estado: EstadoVenta.INICIADA, estadoCobro: EstadoCobro.PENDIENTE, tipoPago: "EFECTIVO",
      compradorId: clienteRoberto.id, inmobiliariaId: idGianfelice
    }
  });
  console.log(`  ✓ Lote 10 (Vendido / Venta Iniciada) - mapId: Lote10-3`);

  // Lote 11: VENDIDO (Con Boleto)
  const lote11 = await prisma.lote.create({
    data: {
      numero: 11, mapId: "Lote11-3", tipo: TipoLote.LOTE_VENTA, subestado: SubestadoLote.NO_CONSTRUIDO,
      superficie: 380, precio: 19000.00, estado: EstadoLote.VENDIDO, fraccionId: fraccion3.id,
      propietarioId: clienteJuan.id,
      ubicacion: { create: { calle: NombreCalle.REINAMORA, numero: 111 } }
    }
  });
  await prisma.venta.create({
    data: {
      numero: `VEN-${lote11.id}-BOL`, loteId: lote11.id, fechaVenta: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
      monto: 19000.00, estado: EstadoVenta.CON_BOLETO, estadoCobro: EstadoCobro.EN_CURSO, tipoPago: "TRANSFERENCIA",
      compradorId: clienteMaria.id, inmobiliariaId: idAndinolfi,
      plazoEscritura: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000)
    }
  });
  console.log(`  ✓ Lote 11 (Vendido / Con Boleto) - mapId: Lote11-3`);

  // Lote 12: DISPONIBLE (Venta Cancelada Histórica)
  const lote12 = await prisma.lote.create({
    data: {
      numero: 12, mapId: "Lote12-3", tipo: TipoLote.LOTE_VENTA, subestado: SubestadoLote.NO_CONSTRUIDO,
      superficie: 390, precio: 19500.00, estado: EstadoLote.DISPONIBLE, fraccionId: fraccion3.id,
      propietarioId: clienteJuan.id,
      ubicacion: { create: { calle: NombreCalle.REINAMORA, numero: 112 } }
    }
  });
  await prisma.venta.create({
    data: {
      numero: `VEN-${lote12.id}-CANC`, loteId: lote12.id, fechaVenta: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
      monto: 19500.00, estado: EstadoVenta.CANCELADA, estadoCobro: EstadoCobro.ELIMINADO, tipoPago: "CUOTAS",
      compradorId: clienteRoberto.id, inmobiliariaId: idGianfelice, fechaBaja: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000)
    }
  });
  console.log(`  ✓ Lote 12 (Disponible / Venta Cancelada) - mapId: Lote12-3`);

  // Lote 13: DISPONIBLE (Prioridad Expirada)
  const lote13 = await prisma.lote.create({
    data: {
      numero: 13, mapId: "Lote13-3", tipo: TipoLote.LOTE_VENTA, subestado: SubestadoLote.NO_CONSTRUIDO,
      superficie: 400, precio: 20000.00, estado: EstadoLote.DISPONIBLE, fraccionId: fraccion3.id,
      propietarioId: clienteJuan.id,
      ubicacion: { create: { calle: NombreCalle.REINAMORA, numero: 113 } }
    }
  });
  await prisma.prioridad.create({
    data: {
      numero: `PRI-${lote13.id}-EXP`, loteId: lote13.id, estado: EstadoPrioridad.EXPIRADA,
      ownerType: OwnerPrioridad.INMOBILIARIA, inmobiliariaId: idAndinolfi,
      fechaInicio: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), fechaFin: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      loteEstadoAlCrear: EstadoLote.DISPONIBLE
    }
  });
  console.log(`  ✓ Lote 13 (Disponible / Prioridad Expirada) - mapId: Lote13-3`);

  // Lote 14: DISPONIBLE (Prioridad Cancelada)
  const lote14 = await prisma.lote.create({
    data: {
      numero: 14, mapId: "Lote14-3", tipo: TipoLote.LOTE_VENTA, subestado: SubestadoLote.NO_CONSTRUIDO,
      superficie: 410, precio: 20500.00, estado: EstadoLote.DISPONIBLE, fraccionId: fraccion3.id,
      propietarioId: clienteJuan.id,
      ubicacion: { create: { calle: NombreCalle.REINAMORA, numero: 114 } }
    }
  });
  await prisma.prioridad.create({
    data: {
      numero: `PRI-${lote14.id}-CANC`, loteId: lote14.id, estado: EstadoPrioridad.CANCELADA,
      ownerType: OwnerPrioridad.CCLF, inmobiliariaId: null,
      fechaInicio: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), fechaFin: new Date(Date.now() + 24 * 60 * 60 * 1000),
      loteEstadoAlCrear: EstadoLote.DISPONIBLE
    }
  });
  console.log(`  ✓ Lote 14 (Disponible / Prioridad Cancelada) - mapId: Lote14-3`);

  // Lote 15: RESERVADO (Prioridad -> Reserva)
  const lote15 = await prisma.lote.create({
    data: {
      numero: 15, mapId: "Lote15-3", tipo: TipoLote.LOTE_VENTA, subestado: SubestadoLote.NO_CONSTRUIDO,
      superficie: 420, precio: 21000.00, estado: EstadoLote.RESERVADO, fraccionId: fraccion3.id,
      propietarioId: clienteJuan.id,
      ubicacion: { create: { calle: NombreCalle.REINAMORA, numero: 115 } }
    }
  });
  // Prioridad finalizada
  await prisma.prioridad.create({
    data: {
      numero: `PRI-${lote15.id}-FIN`, loteId: lote15.id, estado: EstadoPrioridad.FINALIZADA,
      ownerType: OwnerPrioridad.INMOBILIARIA, inmobiliariaId: idSpinosa,
      fechaInicio: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), fechaFin: new Date(Date.now() + 24 * 60 * 60 * 1000),
      loteEstadoAlCrear: EstadoLote.DISPONIBLE
    }
  });
  // Reserva activa resultante
  await prisma.reserva.create({
    data: {
      numero: `RES-${lote15.id}-PRI`, fechaReserva: new Date(), estado: EstadoReserva.ACTIVA,
      loteId: lote15.id, clienteId: clienteMaria.id, inmobiliariaId: idSpinosa,
      sena: 2100.00, loteEstadoAlCrear: EstadoLote.DISPONIBLE,
      fechaFinReserva: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    }
  });
  console.log(`  ✓ Lote 15 (Reservado / Prioridad Finalizada -> Reserva) - mapId: Lote15-3`);


  console.log("\n✅ Seed completado exitosamente.\n");
}

main()
  .catch((e) => {
    console.error("\n❌ ERROR en seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
