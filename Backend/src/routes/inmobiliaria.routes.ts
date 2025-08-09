import { Router } from 'express';
import * as controller from '../controllers/inmobiliaria.controller';

const router = Router();

router.get('/', controller.getAllInmobiliariasController);
router.get('/:id', controller.getInmobiliariaByIdController);
router.post('/', controller.createInmobiliariaController);
router.put('/:id', controller.updateInmobiliariaController);
router.delete('/:id', controller.deleteInmobiliariaController);

export const inmobRoutes = router;
