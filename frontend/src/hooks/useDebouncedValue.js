// src/hooks/useDebouncedValue.js
// Que es lo que hace esto?
// Basicamente deja un tiempito entre que tocas la tecla y se actualiza el valor.
// Esto es util para no hacer demasiadas llamadas a APIs o procesos pesados
// mientras el usuario esta escribiendo.
// Ejemplo: si el usuario escribe "hola" y el delay es 350ms, la actualizacion
// del valor sera 350ms despues de que el usuario deje de escribir. Se puede sacar igual
import { useEffect, useState } from "react";

export function useDebouncedValue(value, delay = 350) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}
