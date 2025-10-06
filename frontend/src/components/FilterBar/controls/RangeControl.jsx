// src/components/FilterBar/controls/RangeControl.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import noUiSlider from "nouislider";
import "nouislider/dist/nouislider.css";

// RangeControl es para todo lo que tiene que ver con los filtros ajustables
// Aca defino que se va a ver, su:
// - unidad - minimo - maximo - valor - paso
export default function RangeControl({
  label,
  unit = "",
  minLimit,
  maxLimit,
  value,        // { min, max }
  onChange,
  step = 1,
}) {
  const sliderRef = useRef(null);
  const apiRef = useRef(null);

  // Strings para permitir tipeo libre sin "rebotar"
  const [minStr, setMinStr] = useState(value.min !== null ? String(value.min) : '');
  const [maxStr, setMaxStr] = useState(value.max !== null ? String(value.max) : '');

  // Sincroniza descendente cuando cambian props.value
  useEffect(() => {
    setMinStr(value.min !== null ? String(value.min) : '');
    setMaxStr(value.max !== null ? String(value.max) : '');
    if (apiRef.current) {
      const minVal = value.min ?? minLimit ?? 0;
      const maxVal = value.max ?? maxLimit ?? 100;
      apiRef.current.set([minVal, maxVal], false);
    }
  }, [value.min, value.max, minLimit, maxLimit]);

  // Init noUiSlider una sola vez
  useEffect(() => {
    if (!sliderRef.current) return;

    // Manejar valores null en los límites
    const safeMinLimit = minLimit ?? 0;
    const safeMaxLimit = maxLimit ?? 100;
    const safeMinValue = value.min ?? safeMinLimit;
    const safeMaxValue = value.max ?? safeMaxLimit;

    apiRef.current = noUiSlider.create(sliderRef.current, {
      start: [safeMinValue, safeMaxValue],
      connect: true,
      range: { min: safeMinLimit, max: safeMaxLimit },
      step,
      behaviour: "tap-drag",
      keyboardSupport: true,
      tooltips: false,
    });

    const api = apiRef.current;

    const onUpdate = (vals) => {
      const [a, b] = vals.map((v) => +v);
      setMinStr(String(a));
      setMaxStr(String(b));
    };
    const onChangeSlider = (vals) => {
      const [a, b] = vals.map((v) => +v);
      onChange?.({ min: a, max: b });
    };

    api.on("update", onUpdate);
    api.on("change", onChangeSlider);

    return () => {
      api.off("update", onUpdate);
      api.off("change", onChangeSlider);
      api.destroy();
      apiRef.current = null;
    };
  }, []);

  const clamp = (n) =>
    Math.max(minLimit, Math.min(maxLimit, Number.isFinite(+n) ? +n : minLimit));

  const commitFromInput = (which) => {
    // Si el input está vacío, usar null para indicar "sin límite"
    const minVal = minStr.trim() === '' ? null : clamp(minStr);
    const maxVal = maxStr.trim() === '' ? null : clamp(maxStr);
    
    // Si ambos son null, usar los límites del slider
    const newMin = minVal ?? minLimit ?? 0;
    const newMax = maxVal ?? maxLimit ?? 100;
    
    if (newMin > newMax) {
      if (which === "min") {
        onChange?.({ min: minVal, max: minVal });
      } else {
        onChange?.({ min: maxVal, max: maxVal });
      }
    } else {
      onChange?.({ min: minVal, max: maxVal });
    }
    
    // Actualizar strings para mostrar
    setMinStr(minVal !== null ? String(minVal) : '');
    setMaxStr(maxVal !== null ? String(maxVal) : '');
    
    // Actualizar slider
    if (apiRef.current) {
      const sliderMin = minVal ?? minLimit ?? 0;
      const sliderMax = maxVal ?? maxLimit ?? 100;
      apiRef.current.set([sliderMin, sliderMax], false);
    }
  };

  const unitPretty = useMemo(() => (unit && unit.trim() ? ` ${unit}` : ""), [unit]);

  return (
    <section className="fb-section" onClick={(e) => e.stopPropagation()}>
      <h4>{label}</h4>

      <div className="fb-range" onClick={(e) => e.stopPropagation()}>
        <div className="fb-noui" ref={sliderRef} />

        <div className="fb-range-inputs" onClick={(e) => e.stopPropagation()}>
          <label>
            <span>Mín</span>
            <input
              type="text"
              inputMode="numeric"
              value={minStr}
              onChange={(e) => setMinStr(e.target.value)}
              onBlur={() => commitFromInput("min")}
              onKeyDown={(e) => e.key === "Enter" && commitFromInput("min")}
              onClick={(e) => e.stopPropagation()}
            />
          </label>

          <span className="dash">—</span>

          <label>
            <span>Máx</span>
            <input
              type="text"
              inputMode="numeric"
              value={maxStr}
              onChange={(e) => setMaxStr(e.target.value)}
              onBlur={() => commitFromInput("max")}
              onKeyDown={(e) => e.key === "Enter" && commitFromInput("max")}
              onClick={(e) => e.stopPropagation()}
            />
          </label>

          {unitPretty && <span className="unit">{unitPretty}</span>}
        </div>
      </div>
    </section>
  );
}
