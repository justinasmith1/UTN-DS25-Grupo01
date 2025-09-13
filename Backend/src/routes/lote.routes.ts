import { Router } from 'express';
import * as loteController from '../controllers/lote.controller';
import { validate, validateParams, validateQuery } from '../middlewares/validation.middleware';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { createLoteSchema, updateLoteSchema, getLoteSchema, deleteLoteSchema, queryLoteSchema } from '../validations/lote.validation';
import { checkLoteStatusForTecnico } from '../middlewares/lote.auth.middleware';

const router = Router();

// GET /api/lotes
router.get(
    '/', 
    authenticate,
    authorize('ADMINISTRADOR', 'GESTOR', 'INMOBILIARIA', 'TECNICO'),
    validateQuery(queryLoteSchema),
    loteController.obtenerTodos);

// GET /api/lotes/:id
router.get(
    '/:id', 
    authenticate,
    authorize('ADMINISTRADOR', 'GESTOR', 'INMOBILIARIA', 'TECNICO'),
    validateParams(getLoteSchema),
    checkLoteStatusForTecnico,
    loteController.obtenerLotePorId);

// POST /api/lotes
router.post(
    '/',
    authenticate,
    authorize('ADMINISTRADOR', 'GESTOR'), // Los técnicos no pueden crear lotes.
    validate(createLoteSchema),
    loteController.crearLote);

// PUT /api/lotes/:id
router.put(
    '/:id',
    authenticate,
    authorize('ADMINISTRADOR', 'GESTOR', 'TECNICO'),
    validateParams(getLoteSchema),
    validate(updateLoteSchema),
    checkLoteStatusForTecnico,
    loteController.actualizarLote);

// DELETE /api/lotes/:id
router.delete(
    '/:id',
    authenticate,
    authorize('ADMINISTRADOR', 'GESTOR', 'TECNICO'),
    validateParams(deleteLoteSchema),
    checkLoteStatusForTecnico,
    loteController.eliminarLote);

export const loteRoutes = router;
