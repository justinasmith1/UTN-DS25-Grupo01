import Router from 'express';
import * as fraccionController from '../controllers/fraccion.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { createFraccionSchema, getFraccionSchema, updateFraccionSchema, deleteFraccionSchema } from '../validations/fraccion.validation';
import { validate, validateParams } from '../middlewares/validation.middleware';

const router = Router();

// GET /api/fracciones
router.get(
    '/',
    authenticate,
    authorize('ADMINISTRADOR', 'GESTOR', 'TECNICO'),
    fraccionController.obtenerTodas
);

// GET /api/fracciones/:id
router.get(
    '/:id',
    authenticate,
    authorize('ADMINISTRADOR', 'GESTOR', 'TECNICO'),
    validateParams(getFraccionSchema),
    fraccionController.obtenerFraccionPorId
);

// POST /api/fracciones
router.post(
    '/',
    authenticate,
    authorize('ADMINISTRADOR', 'GESTOR'),
    validate(createFraccionSchema),
    fraccionController.crearFraccion
);

// PUT /api/fracciones/:id
router.put(
    '/:id',
    authenticate,
    authorize('ADMINISTRADOR', 'GESTOR'),
    validateParams(getFraccionSchema),
    validate(updateFraccionSchema),
    fraccionController.actualizarFraccion
);

// DELETE /api/fracciones/:id
router.delete(
    '/:id', 
    authenticate,
    authorize('ADMINISTRADOR'),
    validateParams(deleteFraccionSchema),
    fraccionController.eliminarFraccion
);

export const fraccionRoutes = router;
