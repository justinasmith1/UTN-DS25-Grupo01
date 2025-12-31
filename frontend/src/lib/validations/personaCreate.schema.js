import { z } from "zod";

/**
 * Helper para preprocesar números: convierte "" o NaN a undefined
 */
const preprocessNumber = (val) => {
  if (val === "" || val === null || val === undefined) return undefined;
  const num = Number(val);
  return Number.isNaN(num) ? undefined : num;
};

/**
 * Función para normalizar identificadorValor según tipo
 */
const normalizeIdentificadorValor = (tipo, valor) => {
  if (!valor || typeof valor !== "string") return valor;
  let normalized = valor.trim();
  
  // Para CUIL/CUIT, quitar guiones, espacios y puntos
  if (tipo === "CUIL" || tipo === "CUIT") {
    normalized = normalized.replace(/[-.\s]/g, "");
  }
  
  return normalized;
};

/**
 * Validación de formato según tipo de identificador
 */
const validateIdentificadorFormat = (tipo, valor) => {
  const normalized = normalizeIdentificadorValor(tipo, valor);
  
  if (tipo === "DNI") {
    return /^\d{8}$/.test(normalized);
  }
  if (tipo === "CUIT" || tipo === "CUIL") {
    return /^\d{11}$/.test(normalized);
  }
  if (tipo === "PASAPORTE") {
    return /^[A-Z0-9]{6,9}$/.test(normalized);
  }
  if (tipo === "OTRO") {
    return normalized.length > 0;
  }
  return false;
};

/**
 * Schema de validación para crear una persona usando Zod
 * Basado en Prisma schema y validaciones del backend
 */
export const personaCreateSchema = z
  .object({
    identificadorTipo: z
      .string({
        required_error: "Seleccioná una opción",
        invalid_type_error: "Seleccioná una opción",
      })
      .refine((val) => val !== "" && val !== null && val !== undefined, {
        message: "Seleccioná una opción",
      })
      .refine((val) => ["DNI", "CUIT", "CUIL", "PASAPORTE", "OTRO"].includes(val), {
        message: "Seleccioná una opción válida",
      }),
    
    identificadorValor: z
      .string({
        required_error: "El valor del identificador es requerido",
        invalid_type_error: "El valor del identificador es requerido",
      })
      .min(1, "El valor del identificador es requerido")
      .transform((val) => val.trim()),
    
    // Datos para persona física
    nombre: z
      .string()
      .max(100, "El nombre no puede tener más de 100 caracteres")
      .optional()
      .transform((val) => val?.trim() || undefined),
    
    apellido: z
      .string()
      .max(100, "El apellido no puede tener más de 100 caracteres")
      .optional()
      .transform((val) => val?.trim() || undefined),
    
    // Datos para persona jurídica
    razonSocial: z
      .string()
      .max(200, "La razón social no puede tener más de 200 caracteres")
      .optional()
      .transform((val) => val?.trim() || undefined),
    
    // Contacto
    telefono: z
      .preprocess(
        preprocessNumber,
        z.union([
          z.number({
            invalid_type_error: "Debe ser un número válido",
          })
            .int("El teléfono debe ser un número entero")
            .positive("El teléfono debe ser un número positivo"),
          z.undefined(),
        ])
      )
      .optional(),
    
    email: z
      .string()
      .optional()
      .refine((val) => {
        // Si está vacío o es undefined, es válido (es opcional)
        if (!val || val.trim() === "") return true;
        // Si tiene contenido, validar formato de email
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim());
      }, {
        message: "Email inválido",
      })
      .transform((val) => val?.trim() || undefined),
    
    // inmobiliariaId: opcional, solo para ADMIN/GESTOR
    inmobiliariaId: z
      .preprocess(
        (val) => {
          if (val === "" || val === null || val === undefined) return null;
          const num = Number(val);
          return Number.isNaN(num) ? null : num;
        },
        z.union([
          z.number().int().positive(),
          z.null(),
          z.undefined(),
        ])
      )
      .optional(),
  })
  .superRefine((data, ctx) => {
    // Validar formato del identificador según tipo
    if (data.identificadorTipo && data.identificadorValor) {
      const isValidFormat = validateIdentificadorFormat(data.identificadorTipo, data.identificadorValor);
      if (!isValidFormat) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Formato incorrecto",
          path: ["identificadorValor"],
        });
      }
    }
    
    // Regla: razonSocial O (nombre + apellido) - al menos uno debe estar presente
    const tieneRazonSocial = !!data.razonSocial && data.razonSocial.trim().length > 0;
    const tieneNombreApellido = !!(data.nombre && data.nombre.trim() && data.apellido && data.apellido.trim());
    
    if (!tieneRazonSocial && !tieneNombreApellido) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Completá razón social o nombre y apellido",
        path: ["razonSocial"],
      });
    }
  })
  .transform((data) => {
    // Asegurar que identificadorValor siempre sea un string
    const normalizedValor = data.identificadorValor 
      ? normalizeIdentificadorValor(data.identificadorTipo, data.identificadorValor)
      : "";
    
    return {
      ...data,
      identificadorValor: normalizedValor,
    };
  });
