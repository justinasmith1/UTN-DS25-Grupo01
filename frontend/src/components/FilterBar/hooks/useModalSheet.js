// Maneja bloqueo de scroll y cálculo de alto de la sheet con ResizeObserver
import { useEffect } from "react";

export default function useModalSheet(open, bodyRef, topRef) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const applyTopHeight = () => {
      const topEl = topRef.current, bodyEl = bodyRef.current;
      if (!topEl || !bodyEl) return;
      const h = Math.ceil(topEl.getBoundingClientRect().height) + 20;
      bodyEl.style.setProperty("--fb-body-max", `${h}px`);
      bodyEl.scrollTo({ top: 0, behavior: "auto" });
    };

    requestAnimationFrame(applyTopHeight);
    const ro = new ResizeObserver(applyTopHeight);
    if (topRef.current) ro.observe(topRef.current);
    window.addEventListener("resize", applyTopHeight);

    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("resize", applyTopHeight);
      ro.disconnect();
    };
  }, [open, bodyRef, topRef]);
}
