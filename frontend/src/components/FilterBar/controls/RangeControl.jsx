// src/components/FilterBar/controls/RangeControl.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import noUiSlider from "nouislider";
import "nouislider/dist/nouislider.css";

/**
 * RangeControl con:
 * - Slider noUi “fino” (la clase .fb-noui se estiliza en FilterBar.css)
 * - Inputs de texto con tipeo libre (string) y commit en blur/Enter
 * - Clamp a [minLimit, maxLimit] y garantía de min <= max
 * - Sincronización bidireccional slider <-> inputs/estado
 */
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

  // Strings para permitir tipeo libre sin “rebotar”
  const [minStr, setMinStr] = useState(String(value.min));
  const [maxStr, setMaxStr] = useState(String(value.max));

  // ↓ Sync descendente cuando cambian props.value
  useEffect(() => {
    setMinStr(String(value.min));
    setMaxStr(String(value.max));
    if (apiRef.current) apiRef.current.set([value.min, value.max], false);
  }, [value.min, value.max]);

  // Init noUiSlider una sola vez
  useEffect(() => {
    if (!sliderRef.current) return;

    apiRef.current = noUiSlider.create(sliderRef.current, {
      start: [value.min, value.max],
      connect: true,
      range: { min: minLimit, max: maxLimit },
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const clamp = (n) =>
    Math.max(minLimit, Math.min(maxLimit, Number.isFinite(+n) ? +n : minLimit));

  const commitFromInput = (which) => {
    let newMin = clamp(minStr);
    let newMax = clamp(maxStr);
    if (newMin > newMax) {
      if (which === "min") newMax = newMin;
      else newMin = newMax;
    }
    setMinStr(String(newMin));
    setMaxStr(String(newMax));
    onChange?.({ min: newMin, max: newMax });
    if (apiRef.current) apiRef.current.set([newMin, newMax], false);
  };

  const unitPretty = useMemo(() => (unit && unit.trim() ? ` ${unit}` : ""), [unit]);

  return (
    <section className="fb-section">
      <h4>{label}</h4>

      <div className="fb-range">
        {/* El mismo div se vuelve .noUi-target => CSS usa .fb-noui.noUi-target */}
        <div className="fb-noui" ref={sliderRef} />

        <div className="fb-range-inputs">
          <label>
            <span>Mín</span>
            <input
              type="text"
              inputMode="numeric"
              value={minStr}
              onChange={(e) => setMinStr(e.target.value)}
              onBlur={() => commitFromInput("min")}
              onKeyDown={(e) => e.key === "Enter" && commitFromInput("min")}
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
            />
          </label>

          {unitPretty && <span className="unit">{unitPretty}</span>}
        </div>
      </div>
    </section>
  );
}
