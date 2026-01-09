// Maneja bloqueo de scroll y cálculo de alto de la sheet con ResizeObserver
import { useEffect, useRef } from "react";

export default function useModalSheet(open, bodyRef, topRef) {
  const isInitialMount = useRef(true);

  useEffect(() => {
    if (!open) {
      isInitialMount.current = true;
      return;
    }

    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const updateHeight = () => {
      const topEl = topRef.current;
      const bodyEl = bodyRef.current;
      if (!topEl || !bodyEl) return;
      const h = Math.ceil(topEl.getBoundingClientRect().height) + 20;
      bodyEl.style.setProperty("--fb-body-max", `${h}px`);
    };

    // Primera vez: actualizar altura y hacer scroll al inicio
    requestAnimationFrame(() => {
      updateHeight();
      if (isInitialMount.current && bodyRef.current) {
        bodyRef.current.scrollTo({ top: 0, behavior: "auto" });
        isInitialMount.current = false;
      }
    });

    // ResizeObserver solo actualiza altura, no hace scroll
    const ro = new ResizeObserver(updateHeight);
    if (topRef.current) ro.observe(topRef.current);
    window.addEventListener("resize", updateHeight);

    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("resize", updateHeight);
      ro.disconnect();
    };
  }, [open, bodyRef, topRef]);
}
