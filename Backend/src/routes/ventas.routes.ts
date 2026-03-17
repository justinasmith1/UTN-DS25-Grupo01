import { Router } from 'express';
import * as ventaController from '../controllers/venta.controller';
import * as pagoController from '../controllers/pago.controller';
import { validate, validateParams, validateQuery } from '../middlewares/validation.middleware';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { createVentaSchema, updateVentaSchema, getVentaSchema, deleteVentaSchema, queryVentaSchema, patchVentaParamsSchema } from '../validations/venta.validation';
import { ventaIdParamSchema, createPlanPagoSchema } from '../validations/pago.validation';

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
    validateQuery(queryVentaSchema),
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

// --- Submódulo Pagos ---

// GET /api/ventas/:ventaId/pagos
router.get(
    '/:ventaId/pagos',
    authenticate,
    authorize('ADMINISTRADOR', 'GESTOR'),
    validateParams(ventaIdParamSchema),
    pagoController.obtenerContextoPagos);

// POST /api/ventas/:ventaId/pagos/plan
router.post(
    '/:ventaId/pagos/plan',
    authenticate,
    authorize('ADMINISTRADOR', 'GESTOR'),
    validateParams(ventaIdParamSchema),
    validate(createPlanPagoSchema),
    pagoController.crearPlanPagoInicial);

export const ventaRoutes = router;
