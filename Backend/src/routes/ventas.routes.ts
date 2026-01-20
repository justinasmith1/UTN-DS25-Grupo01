import { Router } from 'express';
import * as ventaController from '../controllers/venta.controller';
import { validate, validateParams, validateQuery } from '../middlewares/validation.middleware';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { createVentaSchema, updateVentaSchema, getVentaSchema, deleteVentaSchema, queryVentaSchema, patchVentaParamsSchema, reactivarVentaSchema } from '../validations/venta.validation';

const router = Router();

// GET /api/Ventas
router.get(
    '/', 
    authenticate,
    authorize('ADMINISTRADOR', 'GESTOR'),
    ventaController.obtenerTodos);

// GET /api/Ventas/inmobiliaria/:id
router.get(
    '/inmobiliaria/:id',
    authenticate,
    authorize('ADMINISTRADOR', 'GESTOR', 'INMOBILIARIA'),
    validateParams(getVentaSchema),
    ventaController.obtenerVentasPorInmobiliaria);

// GET /api/Ventas/:id
router.get(
    '/:id',
    authenticate,
    authorize('ADMINISTRADOR', 'GESTOR'),
    validateParams(getVentaSchema),
    ventaController.obtenerVentaPorId);

// POST /api/Ventas
router.post(
    '/', 
    authenticate,
    authorize('ADMINISTRADOR', 'GESTOR'),
    validate(createVentaSchema), 
    ventaController.crearVenta);

// PUT /api/Ventas/:id
router.put(
    '/:id', 
    authenticate,
    authorize('ADMINISTRADOR', 'GESTOR'),
    validateParams(updateVentaSchema), 
    ventaController.actualizarVenta);

// DELETE /api/Ventas/:id
router.delete(
    '/:id',
    authenticate,
    authorize('ADMINISTRADOR', 'GESTOR'),
    validateParams(deleteVentaSchema),  
    ventaController.eliminarVenta);

// PATCH /api/Ventas/:id/eliminar
router.patch(
    '/:id/eliminar',
    authenticate,
    authorize('ADMINISTRADOR', 'GESTOR', 'INMOBILIARIA'),
    validateParams(patchVentaParamsSchema),
    ventaController.eliminarVenta
);

// PATCH /api/Ventas/:id/reactivar
router.patch(
    '/:id/reactivar',
    authenticate,
    authorize('ADMINISTRADOR', 'GESTOR', 'INMOBILIARIA'),
    validateParams(patchVentaParamsSchema),
    ventaController.reactivarVenta
);

export const ventaRoutes = router;
