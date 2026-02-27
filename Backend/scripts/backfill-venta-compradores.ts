/**
 * Script de backfill — Etapa 4: Compradores múltiples (relación implícita)
 *
 * Conecta el compradorId legacy de cada Venta en la relación implícita
 * `_VentaCompradores` (Prisma M2M implícita nombrada "VentaCompradores").
 *
 * Es IDEMPOTENTE: verifica si el comprador ya está conectado antes de actuar.
 * Puede ejecutarse N veces sin duplicar relaciones.
 *
 * Uso:
 *   cd Backend
 *   npx ts-node scripts/backfill-venta-compradores.ts
 */

import { PrismaClient } from '../src/generated/prisma';

const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando backfill de compradores (relación implícita)...\n');

  // 1. Detectar ventas cuyo compradorId apunta a una persona inexistente
  const ventasConProblemas = await prisma.$queryRaw<{ id: number; compradorId: number }[]>`
    SELECT v.id, v."compradorId"
    FROM "Venta" v
    LEFT JOIN "Persona" p ON p.id = v."compradorId"
    WHERE p.id IS NULL
  `;

  if (ventasConProblemas.length > 0) {
    console.warn(`ADVERTENCIA: ${ventasConProblemas.length} venta(s) con compradorId inválido:`);
    ventasConProblemas.forEach(v => {
      console.warn(`  - Venta ID ${v.id} → compradorId ${v.compradorId} (persona no existe)`);
    });
    console.warn('Estas ventas serán saltadas.\n');
  }

  const idsConProblemas = new Set(ventasConProblemas.map(v => v.id));

  // 2. Cargar todas las ventas con sus compradores ya conectados (para idempotencia)
  const ventas = await prisma.venta.findMany({
    select: {
      id: true,
      compradorId: true,
      compradores: { select: { id: true } },
    },
  });

  const ventasValidas = ventas.filter(v => !idsConProblemas.has(v.id));

  console.log(`Total ventas:    ${ventas.length}`);
  console.log(`Ventas válidas:  ${ventasValidas.length}`);
  console.log(`Ventas saltadas: ${idsConProblemas.size}\n`);

  let migradas = 0;
  let yaMigradas = 0;
  let errores = 0;

  // 3. Conectar compradorId si todavía no está en la relación implícita
  for (const v of ventasValidas) {
    const yaConectado = v.compradores.some(c => c.id === v.compradorId);

    if (yaConectado) {
      yaMigradas++;
      continue;
    }

    try {
      await prisma.venta.update({
        where: { id: v.id },
        data: {
          compradores: {
            connect: { id: v.compradorId },
          },
        },
      });
      migradas++;
    } catch (err) {
      console.error(`Error conectando venta ID ${v.id} → personaId ${v.compradorId}:`, err);
      errores++;
    }
  }

  console.log('Backfill completado:');
  console.log(`  Migradas:     ${migradas}`);
  console.log(`  Ya migradas:  ${yaMigradas}`);
  console.log(`  Saltadas:     ${idsConProblemas.size}`);
  console.log(`  Errores:      ${errores}`);

  if (errores > 0) {
    console.warn('\nHubo errores. Revisá los logs antes de habilitar la nueva UI.');
    process.exit(1);
  } else {
    console.log('\nBackfill exitoso. La tabla _VentaCompradores está sincronizada.');
  }
}

main()
  .catch((e) => {
    console.error('Error fatal en backfill:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
