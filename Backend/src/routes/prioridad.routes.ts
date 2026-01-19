import { Router } from 'express';
import * as prioridadController from '../controllers/prioridad.controller';
import { validate, validateParams, validateQuery } from '../middlewares/validation.middleware';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import {
  createPrioridadSchema,
  updatePrioridadSchema,
  getPrioridadParamsSchema,
  queryPrioridadesSchema,
} from '../validations/prioridad.validation';

const router = Router();

// GET /api/prioridades
// Permitido para ADMINISTRADOR, GESTOR e INMOBILIARIA
// INMOBILIARIA solo verá sus propias prioridades (filtrado en el servicio)
router.get(
  '/',
  authenticate,
  authorize('ADMINISTRADOR', 'GESTOR', 'INMOBILIARIA'),
  validateQuery(queryPrioridadesSchema),
  prioridadController.getAllPrioridadesController
);

// GET /api/prioridades/:id
// Permitido para ADMINISTRADOR, GESTOR e INMOBILIARIA
// INMOBILIARIA solo puede ver sus propias prioridades (validado en el servicio)
router.get(
  '/:id',
  authenticate,
  authorize('ADMINISTRADOR', 'GESTOR', 'INMOBILIARIA'),
  validateParams(getPrioridadParamsSchema),
  prioridadController.getPrioridadByIdController
);

// POST /api/prioridades
// Permitido para ADMINISTRADOR, GESTOR e INMOBILIARIA
// INMOBILIARIA solo puede crear prioridades propias
router.post(
  '/',
  authenticate,
  authorize('ADMINISTRADOR', 'GESTOR', 'INMOBILIARIA'),
  validate(createPrioridadSchema),
  prioridadController.createPrioridadController
);

// PATCH /api/prioridades/:id
// Permitido para ADMINISTRADOR, GESTOR e INMOBILIARIA
// ADMINISTRADOR/GESTOR pueden actualizar numero e inmobiliariaId
// INMOBILIARIA solo puede actualizar numero de sus propias prioridades
router.patch(
  '/:id',
  authenticate,
  authorize('ADMINISTRADOR', 'GESTOR', 'INMOBILIARIA'),
  validateParams(getPrioridadParamsSchema),
  validate(updatePrioridadSchema),
  prioridadController.updatePrioridadController
);

// PATCH /api/prioridades/:id/cancelar
// Permitido para ADMINISTRADOR, GESTOR e INMOBILIARIA
// INMOBILIARIA solo puede cancelar sus propias prioridades
router.patch(
  '/:id/cancelar',
  authenticate,
  authorize('ADMINISTRADOR', 'GESTOR', 'INMOBILIARIA'),
  validateParams(getPrioridadParamsSchema),
  prioridadController.cancelPrioridadController
);

// PATCH /api/prioridades/:id/finalizar
// Permitido para ADMINISTRADOR, GESTOR e INMOBILIARIA
// INMOBILIARIA solo puede finalizar sus propias prioridades
router.patch(
  '/:id/finalizar',
  authenticate,
  authorize('ADMINISTRADOR', 'GESTOR', 'INMOBILIARIA'),
  validateParams(getPrioridadParamsSchema),
  prioridadController.finalizePrioridadController
);

// POST /api/prioridades/jobs/expire
// Endpoint interno para expirar prioridades vencidas
// Solo ADMINISTRADOR y GESTOR (para uso por scheduler externo)
router.post(
  '/jobs/expire',
  authenticate,
  authorize('ADMINISTRADOR', 'GESTOR'),
  prioridadController.expirePrioridadesController
);

export const prioridadRoutes = router;
