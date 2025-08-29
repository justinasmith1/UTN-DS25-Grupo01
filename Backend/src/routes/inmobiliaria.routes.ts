import { Router } from 'express';
import * as controller from '../controllers/inmobiliaria.controller';
import { createInmbSchema, updateInmbSchema } from '../validations/inmobiliaria.validation';
import { validate } from '../middlewares/validation.middleware';

const router = Router();

router.get('/', controller.getAllInmobiliariasController);
router.get('/:id', controller.getInmobiliariaByIdController);
router.post('/', validate(createInmbSchema),controller.createInmobiliariaController);
router.put('/:id', validate(updateInmbSchema),controller.updateInmobiliariaController);
router.delete('/:id', controller.deleteInmobiliariaController);

export const inmobRoutes = router;
