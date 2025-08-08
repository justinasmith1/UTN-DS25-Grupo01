import { Router } from 'express';
import * as controller from '../controllers/lote.controller';

const router = Router();

router.get('/', controller.obtenerTodos);
router.get('/:id', controller.obtenerPorId);
router.post('/', controller.crear);
router.put('/:id', controller.actualizar);
router.delete('/:id', controller.eliminar);

export const lotesRoutes = router;
