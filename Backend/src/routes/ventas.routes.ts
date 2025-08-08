import { Router } from 'express';
import * as ventaController from '../controllers/venta.controller';

const router = Router();

router.get('/', ventaController.obtenerTodos);
router.get('/:id', ventaController.obtenerVentaPorId);
router.post('/', ventaController.crearVenta);
router.put('/:id', ventaController.actualizarVenta);
router.delete('/:id', ventaController.eliminarVenta);

export const ventaRoutes = router;