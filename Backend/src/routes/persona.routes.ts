import { Router } from 'express';
import { PersonaController } from '../controllers/persona.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { createPersonaSchema, updatePersonaSchema, getPersonaSchema, deletePersonaSchema } from '../validations/persona.validation';
import { validate, validateParams } from '../middlewares/validation.middleware';

const router = Router();
const personaController = new PersonaController(); 

// GET /api/personas?view=ALL|PROPIETARIOS|INQUILINOS|CLIENTES|MIS_CLIENTES&q=...&includeInactive=true
// Permitido para ADMINISTRADOR, GESTOR, TECNICO e INMOBILIARIA
// INMOBILIARIA solo puede usar view=MIS_CLIENTES o view=ALL (que se aplica como MIS_CLIENTES)
router.get(
    '/', 
    authenticate,
    authorize('ADMINISTRADOR', 'GESTOR', 'TECNICO', 'INMOBILIARIA'),
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
// Permitido para ADMINISTRADOR, GESTOR e INMOBILIARIA
// INMOBILIARIA necesita crear clientes para completar reservas
router.post(
    '/', 
    authenticate,
    authorize('ADMINISTRADOR', 'GESTOR', 'INMOBILIARIA'),
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

// PATCH /api/personas/:id/desactivar
router.patch(
    '/:id/desactivar',
    authenticate,
    authorize('ADMINISTRADOR', 'GESTOR'),
    validateParams(deletePersonaSchema),
    personaController.desactivarPersona
);

// PATCH /api/personas/:id/reactivar
router.patch(
    '/:id/reactivar',
    authenticate,
    authorize('ADMINISTRADOR', 'GESTOR'),
    validateParams(deletePersonaSchema),
    personaController.reactivarPersona
);

// DELETE /api/personas/:id (hard delete, solo Admin, solo si no tiene asociaciones)
router.delete(
    '/:id',
    authenticate,
    authorize('ADMINISTRADOR'),
    validateParams(deletePersonaSchema),  
    personaController.eliminarPersona
);

export const personaRoutes = router;