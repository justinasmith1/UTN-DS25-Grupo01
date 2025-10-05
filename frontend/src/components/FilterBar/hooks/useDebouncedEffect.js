import { useEffect, useRef } from "react";

export default function useDebouncedEffect(effect, deps, delay = 250) {
  const first = useRef(true);
  useEffect(() => {
    // ejecutamos siempre la primera vez
    const id = setTimeout(() => effect(), delay);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
