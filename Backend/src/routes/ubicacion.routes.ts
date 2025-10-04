import Router from 'express';
import * as ubicacionController from '../controllers/ubicacion.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { validate, validateParams } from '../middlewares/validation.middleware';
import { createUbicacionSchema, updateUbicacionSchema, getUbicacionSchema, deleteUbicacionSchema } from '../validations/ubicacion.validation';

const router = Router();

// GET /api/ubicaciones
router.get(
  '/',
  authenticate,
  authorize('ADMINISTRADOR', 'GESTOR', 'TECNICO'),
  ubicacionController.obtenerTodas
);

// GET /api/ubicaciones/:id
router.get(
  '/:id',
  authenticate,
  authorize('ADMINISTRADOR', 'GESTOR', 'TECNICO'),
  validateParams(getUbicacionSchema),
  ubicacionController.obtenerUbicacionPorId
);

// POST /api/ubicaciones
router.post(
  '/',
  authenticate,
  authorize('ADMINISTRADOR', 'GESTOR'),
  validate(createUbicacionSchema),
  ubicacionController.crearUbicacion
);

// PUT /api/ubicaciones/:id
router.put(
  '/:id',
  authenticate,
  authorize('ADMINISTRADOR', 'GESTOR'),
  validateParams(getUbicacionSchema),
  validate(updateUbicacionSchema),
  ubicacionController.actualizarUbicacion
);

// DELETE /api/ubicaciones/:id
router.delete(
  '/:id',
  authenticate,
  authorize('ADMINISTRADOR'),
  validateParams(deleteUbicacionSchema),
  ubicacionController.eliminarUbicacion
);

export const ubicacionRoutes = router;

