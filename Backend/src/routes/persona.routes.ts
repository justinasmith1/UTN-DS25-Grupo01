import { Router } from 'express';
import { PersonaController } from '../controllers/persona.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { createPersonaSchema, updatePersonaSchema, getPersonaSchema, deletePersonaSchema } from '../validations/persona.validation';
import { validate, validateParams } from '../middlewares/validation.middleware';

const router = Router();
const personaController = new PersonaController(); // ← Esta línea está bien

// GET /api/personas
router.get(
    '/', 
    authenticate,
    authorize('ADMINISTRADOR', 'GESTOR', 'TECNICO'),
    personaController.obtenerTodas
);

// GET /api/personas/cuil/:cuil
router.get(
    '/cuil/:cuil',
    authenticate,
    authorize('ADMINISTRADOR', 'GESTOR', 'TECNICO'),
    personaController.obtenerPersonaPorCuil
);

// GET /api/personas/:id
router.get(
    '/:id',
    authenticate,
    authorize('ADMINISTRADOR', 'GESTOR', 'TECNICO'),
    validateParams(getPersonaSchema),
    personaController.obtenerPersonaPorId
);

// POST /api/personas
router.post(
    '/', 
    authenticate,
    authorize('ADMINISTRADOR', 'GESTOR'),
    validate(createPersonaSchema), 
    personaController.create
);

// PUT /api/personas/:id
router.put(
    '/:id', 
    authenticate,
    authorize('ADMINISTRADOR', 'GESTOR'),
    validateParams(updatePersonaSchema), 
    personaController.actualizarPersona
);

// DELETE /api/personas/:id
router.delete(
    '/:id',
    authenticate,
    authorize('ADMINISTRADOR'),
    validateParams(deletePersonaSchema),  
    personaController.eliminarPersona
);

export const personaRoutes = router;