// src/hooks/useQueryState.js
// Esto mantiene los filtros en la URL.
// Si lo hacemos en el back (como deberia ser), con esto no cambiamos la interfaz solo el fetch
// Si lo hacemos en el front, con esto mantenemos la URL actualizada y se puede compartir
// Ejemplo: /modules?category=math&level=beginner&price=free
// Si el usuario cambia un filtro, se actualiza la URL sin recargar la pagina
// Si el usuario copia la URL y la pega en otra pestaña, los filtros se mantienen
// Si el usuario recarga la pagina, los filtros se mantienen
import { useLocation, useNavigate } from "react-router-dom";
import { useMemo } from "react";

export function useQueryState() {
  const { search, pathname } = useLocation();
  const navigate = useNavigate();

  const params = useMemo(() => new URLSearchParams(search), [search]);

  function getAll() {
    const out = {};
    params.forEach((v, k) => {
      // si el param se repite (multi), acumulamos en array
      if (out[k]) out[k] = Array.isArray(out[k]) ? [...out[k], v] : [out[k], v];
      else out[k] = v;
    });
    return out;
  }

  // Acepta valores string, undefined o array de strings (para multiselección)
  function setMany(next, replace = true) {
    const draft = new URLSearchParams(search);
    Object.entries(next).forEach(([k, v]) => {
      draft.delete(k);
      if (Array.isArray(v)) {
        v.filter(Boolean).forEach(item => draft.append(k, String(item)));
      } else if (v !== undefined && v !== "") {
        draft.set(k, String(v));
      }
    });
    navigate({ pathname, search: `?${draft.toString()}` }, { replace });
  }

  return { getAll, setMany };
}
