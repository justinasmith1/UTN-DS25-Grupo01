import React, { useEffect, useState } from "react";
import RangeControl from "./RangeControl"; // reutilizamos su slider para clonar el look de "Monto"
import "nouislider/dist/nouislider.css";

/**
 * DateRangeControl
 * - Replica el estilo de RangeControl numérico pero con inputs <input type="date" />.
 * - NO renderiza título: el label lo maneja el padre (así evitamos duplicados).
 * - Internamente usa RangeControl para el slider → mismo aspecto que “Monto”.
 * - Los inputs numéricos del RangeControl se ocultan por CSS y se reemplazan por inputs de fecha.
 */
export default function DateRangeControl({
  // límites en epoch millis
  min = new Date(2020, 0, 1).getTime(),
  max = new Date(2030, 11, 31).getTime(),
  // value: { min, max } en epoch millis
  value = { min: null, max: null },
  onChange,
}) {
  const DAY = 24 * 60 * 60 * 1000;

  // límites en “días” para el slider
  const minD = Math.floor(min / DAY);
  const maxD = Math.floor(max / DAY);

  // estado interno en días (para RangeControl)
  const [rangeD, setRangeD] = useState({
    min: value?.min != null ? Math.floor(value.min / DAY) : minD,
    max: value?.max != null ? Math.floor(value.max / DAY) : maxD,
  });

  // sincronizar si viene cambio externo
  useEffect(() => {
    const next = {
      min: value?.min != null ? Math.floor(value.min / DAY) : minD,
      max: value?.max != null ? Math.floor(value.max / DAY) : maxD,
    };
    if (next.min !== rangeD.min || next.max !== rangeD.max) setRangeD(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value?.min, value?.max, min, max]);

  // helpers
  const toInput = (dDays) => {
    const dt = new Date(dDays * DAY);
    const yyyy = dt.getFullYear();
    const mm = String(dt.getMonth() + 1).padStart(2, "0");
    const dd = String(dt.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };
  const fromInput = (str) => {
    if (!str) return null;
    const [y, m, d] = str.split("-").map((n) => parseInt(n, 10));
    return Math.floor(new Date(y, (m || 1) - 1, d || 1).getTime() / DAY);
  };

  const emit = (nextD) => {
    onChange && onChange({ min: nextD.min * DAY, max: nextD.max * DAY });
  };

  const handleSlider = (nextD) => {
    setRangeD(nextD);
    emit(nextD);
  };

  const handleMinChange = (e) => {
    const v = fromInput(e.target.value);
    if (v == null) return;
    const next = { min: Math.max(minD, Math.min(v, rangeD.max)), max: rangeD.max };
    setRangeD(next);
    emit(next);
  };

  const handleMaxChange = (e) => {
    const v = fromInput(e.target.value);
    if (v == null) return;
    const next = { min: rangeD.min, max: Math.min(maxD, Math.max(v, rangeD.min)) };
    setRangeD(next);
    emit(next);
  };

  return (
    <div className="fb-date-range">
      {/* Slider idéntico al de Monto (sin label para evitar duplicados) */}
      <RangeControl
        label={null}
        unit="días"
        minLimit={minD}
        maxLimit={maxD}
        value={rangeD}
        onChange={handleSlider}
        step={1}
      />

      {/* Inputs de fecha con el mismo layout que RangeControl */}
      <div className="fb-range-inputs fb-date-inputs">
        <div className="range-input">
          <span className="muted">Mín</span>
          <input
            type="date"
            value={toInput(rangeD.min)}
            min={toInput(minD)}
            max={toInput(rangeD.max)}
            onChange={handleMinChange}
          />
        </div>

        <span className="dash">—</span>

        <div className="range-input">
          <span className="muted">Máx</span>
          <input
            type="date"
            value={toInput(rangeD.max)}
            min={toInput(rangeD.min)}
            max={toInput(maxD)}
            onChange={handleMaxChange}
          />
        </div>

        <span className="unit">días</span>
      </div>
    </div>
  );
}
