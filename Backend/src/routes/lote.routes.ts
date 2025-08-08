import { Router } from 'express';
import * as controller from '../controllers/lote.controller';

const router = Router();

router.get('/', controller.obtenerTodosLotes);
router.get('/:id', controller.obtenerPorIdLote);
router.post('/', controller.crearLote);
router.put('/:id', controller.actualizarLote);
router.delete('/:id', controller.eliminarLote);

export const lotesRoutes = router;
