/**
 * Seed para Personas
 * Idempotente: puede ejecutarse múltiples veces sin duplicar datos
 * 
 * Para resetear: SEED_RESET=1 npm run seed:personas
 */

import { PrismaClient, IdentificadorTipo } from "../../src/generated/prisma";
import dotenv from "dotenv";

// Cargar variables de entorno
dotenv.config();

const prisma = new PrismaClient();

// Validar DATABASE_URL
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL no está definido en .env");
}

// Helper para normalizar identificadorValor (igual que en persona.service.ts)
function normalizeIdentificador(tipo: IdentificadorTipo, valor: string): string {
  let normalized = valor.trim();
  
  // Para CUIL/CUIT, eliminar guiones, espacios y puntos
  if (tipo === 'CUIL' || tipo === 'CUIT') {
    normalized = normalized.replace(/[-.\s]/g, '');
  }
  
  return normalized;
}

// Helper para obtener displayName
function getDisplayName(persona: { nombre?: string | null; apellido?: string | null; razonSocial?: string | null }): string {
  if (persona.razonSocial) {
    return persona.razonSocial;
  }
  return `${persona.nombre || ''} ${persona.apellido || ''}`.trim();
}

// Loggear fingerprint de DB
async function logDbFingerprint() {
  const result = await prisma.$queryRawUnsafe<Array<{
    db: string;
    addr: string;
  }>>(`
    SELECT 
      current_database() AS db,
      inet_server_addr() AS addr;
  `);
  
  if (result.length > 0) {
    console.log("\n=== DB FINGERPRINT ===");
    console.log(`Database: ${result[0].db}`);
    console.log(`Server: ${result[0].addr || "local"}`);
  }
}

// Definición de Personas a crear
interface PersonaSeedData {
  identificadorTipo: IdentificadorTipo;
  identificadorValor: string; // Se normalizará antes de upsert
  nombre?: string;
  apellido?: string;
  razonSocial?: string;
  contacto?: string;
  userEmail?: string; // Email del usuario de la inmobiliaria para buscar inmobiliariaId
}

const PERSONAS_DATA: PersonaSeedData[] = [
  // ===== CLIENTES GLOBALES (8) =====
  // Personas físicas
  { identificadorTipo: 'DNI', identificadorValor: '12345678', nombre: 'Juan', apellido: 'Pérez', contacto: '1111-111111' },
  { identificadorTipo: 'DNI', identificadorValor: '23456789', nombre: 'María', apellido: 'González', contacto: '1111-222222' },
  { identificadorTipo: 'CUIL', identificadorValor: '20-12345678-9', nombre: 'Carlos', apellido: 'Rodríguez', contacto: '1111-333333' },
  { identificadorTipo: 'CUIL', identificadorValor: '27-87654321-3', nombre: 'Ana', apellido: 'Martínez', contacto: '1111-444444' },
  { identificadorTipo: 'DNI', identificadorValor: '34567890', nombre: 'Luis', apellido: 'Fernández', contacto: '1111-555555' },
  { identificadorTipo: 'CUIL', identificadorValor: '30-11223344-5', nombre: 'Laura', apellido: 'Sánchez', contacto: '1111-666666' },
  { identificadorTipo: 'DNI', identificadorValor: '45678901', nombre: 'Pedro', apellido: 'López', contacto: '1111-777777' },
  { identificadorTipo: 'CUIL', identificadorValor: '23-99887766-4', nombre: 'Sofía', apellido: 'Torres', contacto: '1111-888888' },
  
  // ===== CLIENTES ASIGNADOS A INMOBILIARIAS (12) =====
  // Gianfelice Andrea (3)
  { identificadorTipo: 'DNI', identificadorValor: '56789012', nombre: 'Roberto', apellido: 'García', contacto: '1111-100001', userEmail: 'gianfeliceandrea@gmail.com' },
  { identificadorTipo: 'CUIL', identificadorValor: '20-55667788-9', nombre: 'Patricia', apellido: 'Morales', contacto: '1111-100002', userEmail: 'gianfeliceandrea@gmail.com' },
  { identificadorTipo: 'CUIT', identificadorValor: '30-12345678-9', razonSocial: 'Constructora Gianfelice SRL', contacto: '1111-100003', userEmail: 'gianfeliceandrea@gmail.com' },
  
  // Andinolfi Inmobiliaria (3)
  { identificadorTipo: 'DNI', identificadorValor: '67890123', nombre: 'Fernando', apellido: 'Díaz', contacto: '1111-200001', userEmail: 'andinolfinmb@gmail.com' },
  { identificadorTipo: 'CUIL', identificadorValor: '27-44332211-2', nombre: 'Carmen', apellido: 'Vargas', contacto: '1111-200002', userEmail: 'andinolfinmb@gmail.com' },
  { identificadorTipo: 'CUIT', identificadorValor: '30-98765432-1', razonSocial: 'Inversiones Andinolfi SA', contacto: '1111-200003', userEmail: 'andinolfinmb@gmail.com' },
  
  // Nicolas Spinosa (3)
  { identificadorTipo: 'DNI', identificadorValor: '78901234', nombre: 'Diego', apellido: 'Ruiz', contacto: '1111-300001', userEmail: 'nspinosa@gmail.com' },
  { identificadorTipo: 'CUIL', identificadorValor: '20-33221100-1', nombre: 'Valeria', apellido: 'Castro', contacto: '1111-300002', userEmail: 'nspinosa@gmail.com' },
  { identificadorTipo: 'CUIT', identificadorValor: '30-11223344-5', razonSocial: 'Spinosa Propiedades SRL', contacto: '1111-300003', userEmail: 'nspinosa@gmail.com' },
  
  // Martin Azcarate (3)
  { identificadorTipo: 'DNI', identificadorValor: '89012345', nombre: 'Gabriel', apellido: 'Mendoza', contacto: '1111-400001', userEmail: 'mazcarate@gmail.com' },
  { identificadorTipo: 'CUIL', identificadorValor: '27-99887766-5', nombre: 'Natalia', apellido: 'Jiménez', contacto: '1111-400002', userEmail: 'mazcarate@gmail.com' },
  { identificadorTipo: 'CUIT', identificadorValor: '30-55667788-9', razonSocial: 'Azcarate Inversiones SA', contacto: '1111-400003', userEmail: 'mazcarate@gmail.com' },
];

async function main() {
  console.log("\n=== INICIANDO SEED: Personas ===\n");
  
  // Loggear fingerprint
  await logDbFingerprint();
  
  const shouldReset = process.env.SEED_RESET === "1";
  
  if (shouldReset) {
    console.log("\n⚠️  SEED_RESET=1 detectado.\n");
    
    // Verificar si hay FKs activas (reservas, ventas, lotes)
    const reservasCount = await prisma.reserva.count({});
    const ventasCount = await prisma.venta.count({});
    const lotesCount = await prisma.lote.count({});
    
    if (reservasCount > 0 || ventasCount > 0 || lotesCount > 0) {
      console.log("⚠️  Hay relaciones activas (Reservas, Ventas o Lotes).");
      console.log("   Estrategia: marcar personas existentes como INACTIVA y recrear solo si no existen.\n");
      
      // Marcar todas las personas del seed como INACTIVA (si existen)
      for (const personaData of PERSONAS_DATA) {
        const valorNormalized = normalizeIdentificador(personaData.identificadorTipo, personaData.identificadorValor);
        
        await prisma.persona.updateMany({
          where: {
            identificadorTipo: personaData.identificadorTipo,
            identificadorValor: valorNormalized,
          },
          data: {
            estado: 'INACTIVA',
          },
        });
      }
    } else {
      // Si no hay relaciones, borrar físicamente
      console.log("✅ No hay relaciones activas. Borrando Personas físicamente.\n");
      await prisma.persona.deleteMany({});
    }
  }
  
  // Obtener inmobiliarias por user.email (cache para evitar queries repetidas)
  const inmobiliariasCache = new Map<string, number>();
  
  async function getInmobiliariaIdByUserEmail(userEmail: string): Promise<number | null> {
    if (inmobiliariasCache.has(userEmail)) {
      return inmobiliariasCache.get(userEmail)!;
    }
    
    const user = await prisma.user.findUnique({
      where: { email: userEmail },
      include: { inmobiliaria: true },
    });
    
    if (!user || !user.inmobiliaria) {
      console.warn(`⚠️  No se encontró inmobiliaria para user.email: ${userEmail}`);
      return null;
    }
    
    inmobiliariasCache.set(userEmail, user.inmobiliaria.id);
    return user.inmobiliaria.id;
  }
  
  // Crear/actualizar Personas
  console.log("📝 Creando/actualizando Personas...\n");
  
  let createdCount = 0;
  let updatedCount = 0;
  let globalesCount = 0;
  let porInmobiliariaCount = 0;
  const personasCreadas: Array<{
    displayName: string;
    identificadorTipo: string;
    identificadorValor: string;
    inmobiliariaId: number | null;
    inmobiliariaNombre?: string;
  }> = [];
  
  for (const personaData of PERSONAS_DATA) {
    const valorNormalized = normalizeIdentificador(personaData.identificadorTipo, personaData.identificadorValor);
    
    // Obtener inmobiliariaId si corresponde
    let inmobiliariaId: number | null = null;
    let inmobiliariaNombre: string | undefined;
    
    if (personaData.userEmail) {
      const inmId = await getInmobiliariaIdByUserEmail(personaData.userEmail);
      if (inmId) {
        inmobiliariaId = inmId;
        const inm = await prisma.inmobiliaria.findUnique({
          where: { id: inmId },
          select: { nombre: true },
        });
        inmobiliariaNombre = inm?.nombre;
        porInmobiliariaCount++;
      } else {
        console.warn(`⚠️  Persona ${personaData.nombre || personaData.razonSocial} no se asignará a inmobiliaria (user no encontrado)`);
        globalesCount++;
      }
    } else {
      globalesCount++;
    }
    
    // Construir data para upsert
    const upsertData: any = {
      identificadorTipo: personaData.identificadorTipo,
      identificadorValor: valorNormalized,
      nombre: personaData.nombre?.trim(),
      apellido: personaData.apellido?.trim(),
      razonSocial: personaData.razonSocial?.trim(),
      contacto: personaData.contacto,
      estado: 'ACTIVA',
      updateAt: new Date(),
    };
    
    if (inmobiliariaId) {
      upsertData.inmobiliariaId = inmobiliariaId;
    }
    
    // Upsert por unique compuesto
    const existing = await prisma.persona.findUnique({
      where: {
        identificadorTipo_identificadorValor: {
          identificadorTipo: personaData.identificadorTipo,
          identificadorValor: valorNormalized,
        },
      },
    });
    
    if (existing) {
      await prisma.persona.update({
        where: {
          identificadorTipo_identificadorValor: {
            identificadorTipo: personaData.identificadorTipo,
            identificadorValor: valorNormalized,
          },
        },
        data: upsertData,
      });
      updatedCount++;
      console.log(`  ✓ Actualizado: ${getDisplayName(upsertData)} (${personaData.identificadorTipo}: ${valorNormalized})`);
    } else {
      await prisma.persona.create({
        data: upsertData,
      });
      createdCount++;
      console.log(`  ✓ Creado: ${getDisplayName(upsertData)} (${personaData.identificadorTipo}: ${valorNormalized})`);
    }
    
    personasCreadas.push({
      displayName: getDisplayName(upsertData),
      identificadorTipo: personaData.identificadorTipo,
      identificadorValor: valorNormalized,
      inmobiliariaId,
      inmobiliariaNombre,
    });
  }
  
  // Verificación final
  console.log("\n=== VERIFICACIÓN FINAL ===\n");
  
  const totalPersonas = await prisma.persona.count({
    where: { estado: 'ACTIVA' },
  });
  
  console.log(`Total Personas ACTIVAS: ${totalPersonas}`);
  console.log(`  - Creadas en este seed: ${createdCount}`);
  console.log(`  - Actualizadas en este seed: ${updatedCount}`);
  console.log(`  - Clientes globales: ${globalesCount}`);
  console.log(`  - Clientes por inmobiliaria: ${porInmobiliariaCount}\n`);
  
  // Contar por inmobiliaria
  const personasPorInmobiliaria = await prisma.persona.groupBy({
    by: ['inmobiliariaId'],
    where: { estado: 'ACTIVA' },
    _count: true,
  });
  
  console.log("Personas por inmobiliaria:");
  for (const grupo of personasPorInmobiliaria) {
    if (grupo.inmobiliariaId === null) {
      console.log(`  - Globales (sin inmobiliaria): ${grupo._count}`);
    } else {
      const inm = await prisma.inmobiliaria.findUnique({
        where: { id: grupo.inmobiliariaId },
        select: { nombre: true },
      });
      console.log(`  - ${inm?.nombre || `ID ${grupo.inmobiliariaId}`}: ${grupo._count}`);
    }
  }
  
  // Tabla de personas creadas
  console.log("\n=== PERSONAS CREADAS/ACTUALIZADAS ===\n");
  console.table(
    personasCreadas.map((p) => ({
      Nombre: p.displayName,
      Tipo: p.identificadorTipo,
      Valor: p.identificadorValor,
      Inmobiliaria: p.inmobiliariaNombre || '(Global)',
    }))
  );
  
  console.log("\n✅ Seed completado exitosamente.\n");
}

main()
  .catch((e) => {
    console.error("\n❌ ERROR en seed:", e);
    if (e.code === 'P2002') {
      console.error("\n⚠️  Violación de unique constraint (P2002).");
      console.error("   Verifica que no haya duplicados en identificadorTipo + identificadorValor.");
    }
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
