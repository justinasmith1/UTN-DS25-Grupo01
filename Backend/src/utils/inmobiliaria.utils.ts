/**
 * Convención del proyecto: inmobiliariaId null = La Federala (CCLF).
 * Centraliza la detección para evitar hardcodear la lógica en múltiples archivos.
 */
export function isFederalaInmobiliaria(inmobiliariaId: number | null | undefined): boolean {
    return inmobiliariaId == null;
}
