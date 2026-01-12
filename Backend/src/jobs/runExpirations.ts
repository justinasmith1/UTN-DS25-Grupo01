// src/jobs/runExpirations.ts
// Agregador de jobs de expiración (reutilizable para futuras expiraciones)
import { expirePromotions } from './expirePromotions';
import { expireReservas } from './expireReservas';

/**
 * Ejecuta todos los jobs de expiración
 * Hoy solo expira promociones, dsp se pueden agregar:
 * - expireReservas()
 * - expirePrioridades()
 * 
 * @returns {Promise<void>}
 */
export async function runExpirations(): Promise<void> {
  console.log('[runExpirations] Iniciando ejecución de jobs de expiración');
  
  try {
    // Expirar promociones
    const promocionesExpiradas = await expirePromotions();
    console.log(`[runExpirations] Promociones expiradas: ${promocionesExpiradas}`);
    
    // Aca se pueden agregar más jobs en el futuro:
    const reservasExpiradas = await expireReservas();
    // const prioridadesExpiradas = await expirePrioridades();
    
    console.log('[runExpirations] Ejecución de jobs de expiración finalizada');
  } catch (error) {
    console.error('[runExpirations] Error al ejecutar jobs de expiración:', error);
    throw error;
  }
}

// Si se ejecuta directamente (node runExpirations.ts o npm run jobs:expirations)
if (require.main === module) {
  runExpirations()
    .then(() => {
      console.log('[runExpirations] Script ejecutado exitosamente');
      process.exit(0);
    })
    .catch((error) => {
      console.error('[runExpirations] Error fatal:', error);
      process.exit(1);
    });
}








