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
  SubestadoLote
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
    await prisma.venta.deleteMany({});
    await prisma.reserva.deleteMany({});
    await prisma.lote.deleteMany({});
    await prisma.fraccion.deleteMany({});
    console.log("✅ Datos borrados.\n");
  }

  // 1. Obtener IDs reales de Inmobiliarias
  const idGianfelice = await getInmobiliariaIdByUserId(INMOBILIARIAS.GIANFELICE);
  const idAndinolfi = await getInmobiliariaIdByUserId(INMOBILIARIAS.ANDINOLFI);

  // 2. Obtener Personas (Clientes)
  const clienteJuan = await findPersonaByDNI("12345678"); // Juan Pérez
  const clienteMaria = await findPersonaByDNI("23456789"); // María González
  const clienteRoberto = await findPersonaByDNI("56789012"); // Roberto García (cliente de Gianfelice)

  // 3. Crear Fracción
  const fraccion1 = await prisma.fraccion.create({
    data: {
      numero: 1,
    },
  });
  console.log(`✓ Fracción 1 creada (ID: ${fraccion1.id})`);

  // 4. Crear Lotes
  console.log("\n📝 Creando Lotes...");

  // Lote 1: DISPONIBLE
  const lote1 = await prisma.lote.create({
    data: {
      numero: 1, // Corregido: 'lote' -> 'numero'
      tipo: TipoLote.LOTE_VENTA, // Corregido: agregado campo obligatorio
      subestado: SubestadoLote.NO_CONSTRUIDO,
      superficie: 300,
      precio: 15000.00,
      estado: EstadoLote.DISPONIBLE,
      fraccionId: fraccion1.id,
      propietarioId: clienteJuan.id, // Juan es el dueño original
      ubicacion: {
        create: {
          calle: NombreCalle.REINAMORA, // Corregido: enum válido
          numero: 101,
        }
      }
    },
  });
  console.log(`  ✓ Lote 1 (Disponible)`);

  // Lote 2: RESERVADO (por María)
  const lote2 = await prisma.lote.create({
    data: {
      numero: 2,
      tipo: TipoLote.LOTE_VENTA,
      superficie: 350,
      precio: 18000.00,
      estado: EstadoLote.RESERVADO,
      fraccionId: fraccion1.id,
      propietarioId: clienteJuan.id,
      ubicacion: {
        create: {
          calle: NombreCalle.REINAMORA,
          numero: 102,
        }
      }
    },
  });
  console.log(`  ✓ Lote 2 (Reservado)`);

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
      tipo: TipoLote.LOTE_VENTA,
      superficie: 400,
      precio: 20000.00,
      estado: EstadoLote.VENDIDO,
      fraccionId: fraccion1.id,
      propietarioId: clienteRoberto.id, // El propietario ya es Roberto
      ubicacion: {
        create: {
          calle: NombreCalle.ZORZAL,
          numero: 201,
        }
      }
    },
  });
  console.log(`  ✓ Lote 3 (Vendido)`);

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
      // reservaId se conecta aquí pero debemos actualizar la reserva también
      reservaId: reservaLote3.id 
    },
  });

  // Conectar reserva a venta
  await prisma.reserva.update({
    where: { id: reservaLote3.id },
    data: { ventaId: venta.id }
  });
  
  console.log(`    -> Venta y Reserva consumida creadas para Lote 3 (Comprador: Roberto)`);

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
