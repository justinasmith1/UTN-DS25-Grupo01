import { Request, Response } from 'express';
import { PersonaService } from '../services/persona.service';
import { createPersonaSchema, updatePersonaSchema, getPersonaSchema, deletePersonaSchema } from '../validations/persona.validation';
import { GetPersonasResponse, PostPersonaResponse, GetPersonaResponse, PutPersonaResponse, DeletePersonaResponse, PostPersonaRequest, PutPersonaRequest } from '../types/interfacesCCLF';


const personaService = new PersonaService();

export class PersonaController {
    async create(req: Request, res: Response) {
    try {
        const validatedData = createPersonaSchema.parse(req.body);

        // Convertir el identificador de objeto a string para que coincida con CreatePersonaDto
        const createData = {
            ...validatedData,
            identificador: `${validatedData.identificador}:${validatedData.identificador}`
        };

        const persona = await personaService.create(createData);

        const response: PostPersonaResponse = {
            persona,
            message: 'Persona creada exitosamente'
        };

        res.status(201).json({
            success: true,
            ...response
        });
    } catch (error: any) {
        if (error.errors) {
            res.status(400).json({
            success: false,
            message: 'Error de validación',
            errors: error.errors
        });
        } else {
            res.status(error.statusCode || 400).json({
                success: false,
                message: error.message || 'Error al crear la persona'
            });
        }
    }
}

async obtenerTodas(req: Request, res: Response) {
    try {
        const result = await personaService.findAll();

        const response: GetPersonasResponse = {
            personas: result.personas,
            total: result.total
        };

        res.status(200).json({
            success: true,
            message: 'Personas obtenidas exitosamente',
            ...response
        });
        } catch (error: any) {
        res.status(500).json({
            success: false,
            message: error.message || 'Error al obtener las personas'
        });
    }
}

async obtenerPersonaPorId(req: Request, res: Response) {
    try {
        const { id } = getPersonaSchema.parse(req.params);

        const persona = await personaService.findById(id);

        const response: GetPersonaResponse = {
            persona,
            message: 'Persona obtenida exitosamente'
        };

        res.status(200).json({
            success: true,
            ...response
        });
    } catch (error: any) {
        if (error.errors) {
            res.status(400).json({
            success: false,
            message: 'Error de validación',
            errors: error.errors
            });
        } else {
            res.status(error.statusCode || 404).json({
                success: false,
                message: error.message || 'Persona no encontrada'
            });
        }
    }
}

async actualizarPersona(req: Request, res: Response) {
    try {
        const { id } = getPersonaSchema.parse(req.params);
        const validatedData = updatePersonaSchema.parse(req.body);

        // Convertir el identificador de objeto a string para que coincida con UpdatePersonaDto
        let updateData: any = { ...validatedData };
        
        if (validatedData.identificador) {
            updateData.identificador = `${validatedData.identificador.tipo}:${validatedData.identificador.valor}`;
        }

        const result = await personaService.update(id, updateData);

        const response: PutPersonaResponse = {
            persona: result.persona,
            message: result.message
        };

        res.status(200).json({
            success: true,
            ...response
        });
    } catch (error: any) {
        if (error.errors) {
            res.status(400).json({
            success: false,
            message: 'Error de validación',
            errors: error.errors
            });
        } else {
            res.status(error.statusCode || 400).json({
                success: false,
                message: error.message || 'Error al actualizar la persona'
            });
        }
    }
}

async eliminarPersona(req: Request, res: Response) {
    try {
        const { id } = deletePersonaSchema.parse(req.params);

        const response: DeletePersonaResponse = await personaService.delete(id);

        res.status(200).json({
            success: true,
            ...response
        });
        } catch (error: any) {
        if (error.errors) {
            res.status(400).json({
            success: false,
            message: 'Error de validación',
            errors: error.errors
            });
        } else {
            res.status(error.statusCode || 400).json({
                success: false,
                message: error.message || 'Error al eliminar la persona'
            });
        }
    }
}

async obtenerPersonaPorCuil(req: Request, res: Response) {
    try {
        const { cuil } = req.params;
        
        const persona = await personaService.findByCuil(cuil);

        if (!persona) {
            return res.status(404).json({
            success: false,
            message: 'Persona no encontrada'
            });
        }

        const response: GetPersonaResponse = {
            persona,
            message: 'Persona obtenida exitosamente'
        };

        res.status(200).json({
            success: true,
            ...response
        });
        } catch (error: any) {
            res.status(500).json({
                success: false,
                message: error.message || 'Error al buscar la persona'
            });
        }
    }
}