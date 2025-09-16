// src/lib/forms/validate.js
// ─────────────────────────────────────────────────────────────
// Utilidades simples de validación en el FRONT (UX mínima).
// El backend sigue siendo el posta con Zod. Estas reglas evitan
// requests obvias y permiten marcar campos antes de enviar.
// ─────────────────────────────────────────────────────────────

export const normStr = (v) => (typeof v === 'string' ? v.trim() : v);
export const normNum = (v) => (v === '' || v == null ? null : Number(v));

// Requerido: muestra "Campo obligatorio" si viene vacío
export const req = (msg = 'Campo obligatorio') => (v) =>
  v === undefined || v === null || v === '' ? msg : null;

// Email básico (no reemplaza validación del back)
export const email = (msg = 'Email inválido') => (v) =>
  !v ? null : /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? null : msg;

// Número positivo (>= 0 si querés usar nonnegative)
export const positive = (msg = 'Debe ser un número positivo') => (v) =>
  v == null || v === '' ? null : Number(v) > 0 ? null : msg;

// Ejecuta reglas por campo: { campo: [val1, val2, ...] }
export function runValidators(formState, rules = {}) {
  const fieldErrors = {};
  for (const [field, validators] of Object.entries(rules)) {
    for (const validate of validators) {
      const err = validate(formState[field]);
      if (err) {
        fieldErrors[field] = err; // toma el primer error que aparece
        break;
      }
    }
  }
  return { ok: Object.keys(fieldErrors).length === 0, fieldErrors };
}
