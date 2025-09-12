import { Router } from 'express';
import * as reservaController from '../controllers/reserva.controller';
import { validate, validateParams, validateQuery } from '../middlewares/validation.middleware';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { createReservaSchema, updateReservaSchema, getReservaParamsSchema, deleteReservaParamsSchema, queryReservasSchema } from '../validations/reserva.validation';

const router = Router();

// GET /api/Reservas
router.get(
    '/', 
    authenticate,
    authorize('ADMINISTRADOR', 'GESTOR',),
    reservaController.getAllReservasController);

// GET /api/Reservas/:id
router.get(
    '/:id',
    authenticate,
    authorize('ADMINISTRADOR', 'GESTOR'),
    validateParams(getReservaParamsSchema),
    reservaController.getReservaByIdController);

// GET /api/Reservas/inmobiliaria/:idInmobiliaria
router.get(
    '/:idInmobiliaria',
    authenticate,
    authorize('ADMINISTRADOR', 'GESTOR', 'INMOBILIARIA'),
    validateParams(getReservaParamsSchema),
    reservaController.getAllReservasByInmobiliariaController);

// POST /api/Reservas
router.post(
    '/', 
    authenticate,
    authorize('ADMINISTRADOR', 'GESTOR', 'INMOBILIARIA'),
    validate(createReservaSchema), 
    reservaController.createReservaController);

// PUT /api/Reservas/:id
router.put(
    '/:id', 
    authenticate,
    authorize('ADMINISTRADOR', 'GESTOR'),
    validateParams(updateReservaSchema), 
    reservaController.updateReservaController);

// DELETE /api/Reservas/:id
router.delete(
    '/:id',
    authenticate,
    authorize('ADMINISTRADOR', 'GESTOR'),
    validateParams(deleteReservaParamsSchema),  
    reservaController.deleteReservaController);

export const ReservaRoutes = router;