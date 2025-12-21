/**
 * Seed para Users e Inmobiliarias
 * Idempotente: puede ejecutarse múltiples veces sin duplicar datos
 * 
 * Para resetear y forzar IDs fijos: SEED_RESET=1 npm run seed:core
 */

import { PrismaClient, Role } from "../src/generated/prisma";
import bcrypt from "bcrypt";
import dotenv from "dotenv";

// Cargar variables de entorno
dotenv.config();

const prisma = new PrismaClient();

// Validar DATABASE_URL
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL no está definido en .env");
}

// Helper para hashear password (mismo que usa el servicio)
async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
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

// Definición de Users con IDs fijos
const USERS_DATA = [
  // ADMINISTRADOR
  { id: 10, username: "MariaSantillan", email: "mariasantillan@gmail.com", password: "contra5", role: "ADMINISTRADOR" as Role },
  { id: 11, username: "Usuario2", email: "usuario2@gmail.com", password: "contra9", role: "ADMINISTRADOR" as Role },
  
  // GESTOR
  { id: 13, username: "EmilioSautel", email: "emiliosautel@gmail.com", password: "contra7", role: "GESTOR" as Role },
  
  // TECNICO
  { id: 14, username: "Tecnico1", email: "tecnico1@gmail.com", password: "contra10", role: "TECNICO" as Role },
  
  // INMOBILIARIA
  { id: 8, username: "GianfeliceAndrea", email: "gianfeliceandrea@gmail.com", password: "contra8", role: "INMOBILIARIA" as Role },
  { id: 9, username: "AndinolfiInmb", email: "andinolfinmb@gmail.com", password: "contra6", role: "INMOBILIARIA" as Role },
  { id: 12, username: "MartinAzcarate", email: "mazcarate@gmail.com", password: "inmobiliariaAzcarate", role: "INMOBILIARIA" as Role },
  { id: 15, username: "NicolasSpinosa", email: "nspinosa@gmail.com", password: "inmobiliariaNicolas", role: "INMOBILIARIA" as Role },
];

// Definición de Inmobiliarias vinculadas por userId
const INMOBILIARIAS_DATA = [
  {
    userId: 8,
    nombre: "Gianfelice Andrea",
    razonSocial: "Gianfelice Andrea SRL",
    contacto: "1111-000001",
    comxventa: 5,
  },
  {
    userId: 9,
    nombre: "Andinolfi Inmobiliaria",
    razonSocial: "Andinolfi SRL",
    contacto: "1111-000002",
    comxventa: 5,
  },
  {
    userId: 12,
    nombre: "Martin Azcarate Negocios Inmobiliarios",
    razonSocial: "Martin Azcarate SRL",
    contacto: "1111-555980",
    comxventa: 5,
  },
  {
    userId: 15,
    nombre: "Nicolas Spinosa Operaciones Inmobiliarias",
    razonSocial: "Nicolas Spinosa SRL",
    contacto: "1111-548970",
    comxventa: 5,
  },
];

async function main() {
  console.log("\n=== INICIANDO SEED: Users + Inmobiliarias ===\n");
  
  // Loggear fingerprint
  await logDbFingerprint();
  
  const shouldReset = process.env.SEED_RESET === "1";
  
  if (shouldReset) {
    console.log("\n⚠️  SEED_RESET=1 detectado. Se borrarán User e Inmobiliaria antes de recrear.\n");
    
    // Borrar en orden correcto (primero Inmobiliaria por FK)
    await prisma.inmobiliaria.deleteMany({});
    await prisma.user.deleteMany({});
    
    // Resetear secuencia al mínimo ID - 1
    const minUserId = Math.min(...USERS_DATA.map(u => u.id));
    await prisma.$executeRawUnsafe(
      `SELECT setval('"User_id_seq"', ${minUserId - 1}, true);`
    );
    
    console.log("✅ Datos borrados y secuencias reseteadas.\n");
  }
  
  // Crear/actualizar Users
  console.log("📝 Creando/actualizando Users...");
  
  // Ordenar por ID para crear en orden (importante para que los IDs coincidan)
  const sortedUsersData = [...USERS_DATA].sort((a, b) => a.id - b.id);
  
  for (const userData of sortedUsersData) {
    const existingUser = await prisma.user.findUnique({
      where: { email: userData.email },
    });
    
    if (existingUser) {
      // Verificar que el ID coincida
      if (existingUser.id !== userData.id) {
        throw new Error(
          `Usuario con email ${userData.email} existe pero tiene ID ${existingUser.id} en lugar de ${userData.id}. ` +
          `Ejecuta con SEED_RESET=1 para forzar IDs correctos.`
        );
      }
      
      // Actualizar si existe
      const hashedPassword = await hashPassword(userData.password);
      await prisma.user.update({
        where: { id: userData.id },
        data: {
          username: userData.username,
          password: hashedPassword,
          role: userData.role,
        },
      });
      console.log(`  ✓ Actualizado: ${userData.email} (ID: ${userData.id})`);
    } else {
      // Crear nuevo usuario
      // En modo reset, la secuencia debería estar ajustada para que el siguiente ID sea el correcto
      const hashedPassword = await hashPassword(userData.password);
      
      // Ajustar secuencia al ID deseado - 1 antes de crear
      await prisma.$executeRawUnsafe(
        `SELECT setval('"User_id_seq"', ${userData.id - 1}, true);`
      );
      
      const created = await prisma.user.create({
        data: {
          username: userData.username,
          email: userData.email.toLowerCase().trim(),
          password: hashedPassword,
          role: userData.role,
        },
      });
      
      // Verificar que el ID sea el esperado
      if (created.id !== userData.id) {
        throw new Error(
          `Usuario creado con ID ${created.id} pero se esperaba ${userData.id}. ` +
          `Ejecuta con SEED_RESET=1 para forzar IDs correctos.`
        );
      }
      
      console.log(`  ✓ Creado: ${userData.email} (ID: ${userData.id})`);
    }
  }
  
  // Asegurar que la secuencia esté en el máximo ID usado + 1
  const maxUserId = Math.max(...USERS_DATA.map(u => u.id));
  await prisma.$executeRawUnsafe(
    `SELECT setval('"User_id_seq"', ${maxUserId}, true);`
  );
  
  // Crear/actualizar Inmobiliarias
  console.log("\n📝 Creando/actualizando Inmobiliarias...");
  
  for (const inmobData of INMOBILIARIAS_DATA) {
    // Verificar que el usuario existe
    const user = await prisma.user.findUnique({
      where: { id: inmobData.userId },
    });
    
    if (!user) {
      throw new Error(`Usuario con ID ${inmobData.userId} no existe. Debe crearse primero.`);
    }
    
    // Upsert por userId (es unique)
    await prisma.inmobiliaria.upsert({
      where: { userId: inmobData.userId },
      update: {
        nombre: inmobData.nombre,
        razonSocial: inmobData.razonSocial,
        contacto: inmobData.contacto,
        comxventa: inmobData.comxventa,
        // maxPrioridadesActivas queda en default del schema (5)
      },
      create: {
        userId: inmobData.userId,
        nombre: inmobData.nombre,
        razonSocial: inmobData.razonSocial,
        contacto: inmobData.contacto,
        comxventa: inmobData.comxventa,
        // maxPrioridadesActivas queda en default del schema (5)
      },
    });
    
    console.log(`  ✓ ${inmobData.nombre} (userId: ${inmobData.userId})`);
  }
  
  // Verificación final
  console.log("\n=== VERIFICACIÓN FINAL ===\n");
  
  const userCount = await prisma.user.count();
  const inmobCount = await prisma.inmobiliaria.count();
  
  console.log(`Total Users: ${userCount}`);
  console.log(`Total Inmobiliarias: ${inmobCount}\n`);
  
  const users = await prisma.user.findMany({
    select: { id: true, email: true, role: true },
    orderBy: { id: "asc" },
  });
  
  console.log("Users creados:");
  users.forEach((u) => {
    console.log(`  - ID ${u.id}: ${u.email} (${u.role})`);
  });
  
  const inmobs = await prisma.inmobiliaria.findMany({
    select: { id: true, nombre: true, userId: true },
    orderBy: { userId: "asc" },
  });
  
  console.log("\nInmobiliarias creadas:");
  inmobs.forEach((i) => {
    console.log(`  - ${i.nombre} (userId: ${i.userId})`);
  });
  
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
