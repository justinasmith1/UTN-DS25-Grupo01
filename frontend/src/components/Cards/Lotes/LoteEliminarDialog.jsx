import EliminarBase from "../Base/EliminarBase.jsx";
import { removeLotePrefix } from "../../../utils/mapaUtils.js";

export default function LoteEliminarDialog({
  open,
  lote,
  loading = false,
  onCancel,
  onConfirm,
}) {
  if (!open || !lote) return null;

  const propietario =
    lote?.propietario?.nombre
      ? `${lote.propietario.nombre} ${lote.propietario.apellido ?? ""}`.trim()
      : null;

  // Nunca mostramos el ID interno del lote en la UI.
  // Si no hay mapId, no mostramos identificador en este lugar.
  const mapIdClean = lote?.mapId ? removeLotePrefix(lote.mapId) : "—";
  const title = `Eliminar Lote${mapIdClean !== "—" ? ` N° ${mapIdClean}` : ""}`;

  // Mensaje tipo pregunta (línea 1)
  const message = `¿Seguro que deseas eliminar${mapIdClean !== "—" ? ` el lote #${mapIdClean}` : " este lote"}?. Esta acción es irreversible.`;

  // Detalles listados con bullets
  const details = [
    propietario ? `Propietario: ${propietario}` : null,
    `Estado: ${lote?.estado ?? "—"}`
  ].filter(Boolean);

  // Nota final en negrita
  const noteBold = "Esta acción es irreversible.";

  return (
    <EliminarBase
      open={open}
      title={title}
      message={message}
      details={details}
      noteBold={noteBold}
      confirmLabel="Eliminar Lote"
      loading={loading}
      onCancel={onCancel}
      onConfirm={onConfirm} 
    />
  );
}