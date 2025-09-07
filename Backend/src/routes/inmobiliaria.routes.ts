import { Router } from 'express';
import * as controller from '../controllers/inmobiliaria.controller';
import * as v from '../validations/inmobiliaria.validation';
import { validate, validateParams} from '../middlewares/validation.middleware';

const router = Router();

router.get('/', controller.getAllInmobiliariasController);
router.get('/:id', validateParams(v.getInmobiliariaSchema),controller.getInmobiliariaByIdController);
router.post('/', validate(v.createInmobiliariaSchema),controller.createInmobiliariaController);
router.put('/:id', validateParams(v.idParamSchema), validate(v.updateInmobiliariaSchema), controller.updateInmobiliariaController);
router.delete('/:id', validateParams(v.deleteInmobiliariaSchema),controller.deleteInmobiliariaController);

export const inmobRoutes = router;
