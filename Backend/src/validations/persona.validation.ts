import { z } from "zod";

// Subschema para identificador
const identificadorSchema = z
  .object({
    tipo: z.enum(["DNI", "CUIT", "CUIL", "Pasaporte"]),
    valor: z.string(),
  })
  .refine(
    (data) => {
      const { tipo, valor } = data;
      if (tipo === "DNI") return /^\d{8}$/.test(valor);
      if (tipo === "CUIT" || tipo === "CUIL") return /^\d{2}-?\d{8}-?\d{1}$/.test(valor);
      if (tipo === "Pasaporte") return /^[A-Z0-9]{6,9}$/.test(valor);
      return false;
    },
    {
      message: "Valor de identificador no coincide con el tipo especificado",
      path: ["valor"],
    }
  );

export const createPersonaSchema = z.object({
  nombre: z
    .string()
    .min(1, "El nombre es requerido")
    .max(100, "El nombre no puede tener mas de 100 caracteres"),
  apellido: z
    .string()
    .min(1, "El apellido es requerido")
    .max(100, "El apellido no puede tener mas de 100 caracteres"),
  identificador: identificadorSchema,
  telefono: z
    .number()
    .int()
    .positive("El telefono debe ser un numero positivo")
    .optional(),
  email: z.string().email("Email invalido").optional(),
  jefeDeFamiliaId: z.number().int().positive().optional(),
});

export const updatePersonaSchema = z.object({
  nombre: z.string().min(1).max(100).optional(),
  apellido: z.string().min(1).max(100).optional(),
  identificador: identificadorSchema.optional(),
  telefono: z.number().int().positive().optional(),
  email: z.string().email("Email invalido").optional(),
  jefeDeFamiliaId: z.number().int().positive().optional(),
});

export const getPersonaSchema = z.object({
  id: z.string().regex(/^\d+$/, "ID debe ser un numero").transform(Number),
});

export const deletePersonaSchema = z.object({
  id: z.string().regex(/^\d+$/, "ID debe ser un numero").transform(Number),
});
