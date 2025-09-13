import { Router } from 'express';
import * as inmobiliariaController from '../controllers/inmobiliaria.controller';
import { validate, validateParams} from '../middlewares/validation.middleware';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { createInmobiliariaSchema, updateInmobiliariaSchema, getInmobiliariaSchema, deleteInmobiliariaSchema } from '../validations/inmobiliaria.validation';

const router = Router();

//GET /api/inmobiliarias
router.get(
    '/',
    authenticate,
    authorize('ADMINISTRADOR', 'GESTOR'),
    inmobiliariaController.getAllInmobiliariasController);

//GET /api/inmobiliarias/:id
router.get(
    '/:id',
    authenticate,
    authorize('ADMINISTRADOR', 'GESTOR'),
    validateParams(getInmobiliariaSchema),
    inmobiliariaController.getInmobiliariaByIdController);

//POST /api/inmobiliarias
router.post(
    '/',
    authenticate,
    authorize('ADMINISTRADOR', 'GESTOR'),
    validate(createInmobiliariaSchema), 
    inmobiliariaController.createInmobiliariaController);

//PUT /api/inmobiliarias/:id
router.put(
    '/:id',
    authenticate,
    authorize('ADMINISTRADOR', 'GESTOR'),
    validateParams(updateInmobiliariaSchema),
    inmobiliariaController.updateInmobiliariaController);

//DELETE /api/inmobiliarias/:id
router.delete(
    '/:id',
    authenticate,
    authorize('ADMINISTRADOR', 'GESTOR'),
    validateParams(deleteInmobiliariaSchema),
    inmobiliariaController.deleteInmobiliariaController);

export const inmobRoutes = router;
