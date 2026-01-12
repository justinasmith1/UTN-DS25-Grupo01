// Diálogo de confirmación para reactivar una inmobiliaria (cambiar de ELIMINADO a OPERATIVO).
import EliminarBase from "../Base/EliminarBase.jsx";

export default function InmobiliariaReactivarDialog({
    open,
    inmobiliaria,
    loading = false,
    onCancel,
    onConfirm,
}) {
    if (!open || !inmobiliaria) return null;

    const title = `Reactivar Inmobiliaria: ${inmobiliaria?.nombre ?? "—"}`;

    // Mensaje tipo pregunta
    const message = `¿Seguro que deseas reactivar la inmobiliaria "${inmobiliaria?.nombre ?? "—"}"? Pasará a estado OPERATIVO y volverá a aparecer en la lista activa.`;

    // Detalles listados con bullets
    const details = [
        `Nombre: ${inmobiliaria?.nombre ?? "—"}`,
        inmobiliaria?.razonSocial ? `Razón Social: ${inmobiliaria.razonSocial}` : null,
    ].filter(Boolean);

    // Nota final
    const noteBold = "La inmobiliaria volverá a estar disponible para ventas y reservas.";

    return (
        <EliminarBase
            open={open}
            title={title}
            message={message}
            details={details}
            noteBold={noteBold}
            confirmLabel="Reactivar Inmobiliaria"
            loading={loading}
            loadingLabel="Reactivando…"
            onCancel={onCancel}
            onConfirm={onConfirm}
        />
    );
}
