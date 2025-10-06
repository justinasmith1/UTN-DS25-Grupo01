// src/components/FilterBar/controls/DateRangeControl.jsx
import { useEffect, useRef, useState } from "react";
import noUiSlider from "nouislider";
import "nouislider/dist/nouislider.css";

// DateRangeControl especializado para manejar rangos de fechas
export default function DateRangeControl({
  unit = "",
  minLimit,
  maxLimit,
  value,        // { min, max } - timestamps en ms
  onChange,
  step = 86400000, // 1 día en ms por defecto
}) {
  const sliderRef = useRef(null);
  const apiRef = useRef(null);
  const onChangeRef = useRef(onChange);
  
  // Actualizar la referencia cuando onChange cambie
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Convertir timestamps a strings de fecha para mostrar
  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    return new Date(timestamp).toISOString().split('T')[0]; // YYYY-MM-DD
  };

  // Convertir string de fecha a timestamp
  const parseDate = (dateStr) => {
    if (!dateStr) return null;
    return new Date(dateStr).getTime();
  };

  // Strings para permitir tipeo libre
  const [minStr, setMinStr] = useState(formatDate(value.min));
  const [maxStr, setMaxStr] = useState(formatDate(value.max));

  // Sincroniza descendente cuando cambian props.value
  useEffect(() => {
    setMinStr(formatDate(value.min));
    setMaxStr(formatDate(value.max));
    if (apiRef.current) apiRef.current.set([value.min, value.max], false);
  }, [value.min, value.max]);

  // Init noUiSlider una sola vez
  useEffect(() => {
    if (!sliderRef.current) return;

    // Manejar valores null en los límites
    const safeMinLimit = minLimit ?? new Date('2020-01-01').getTime();
    const safeMaxLimit = maxLimit ?? new Date('2030-12-31').getTime();
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

    // Event listener para cambios del slider
    const handleSlide = (values) => {
      const [min, max] = values;
      onChangeRef.current({ min: Number(min), max: Number(max) });
    };

    apiRef.current.on('update', handleSlide);

    return () => {
      if (apiRef.current) {
        apiRef.current.destroy();
        apiRef.current = null;
      }
    };
  }, [minLimit, maxLimit, step, value.min, value.max]);

  // Commits desde input a slider
  const commitFromInput = (type) => {
    const str = type === "min" ? minStr : maxStr;
    const parsed = parseDate(str);
    
    if (parsed !== null && !isNaN(parsed)) {
      const newValue = { ...value, [type]: parsed };
      onChangeRef.current(newValue);
    } else {
      // Si el input es inválido, revertir al valor anterior
      setMinStr(formatDate(value.min));
      setMaxStr(formatDate(value.max));
    }
  };

  const unitPretty = unit;

  return (
    <section className="fb-range-control" onClick={(e) => e.stopPropagation()}>
      <div className="fb-range-slider" ref={sliderRef} onClick={(e) => e.stopPropagation()}></div>
      
      <div className="fb-range-inputs" onClick={(e) => e.stopPropagation()}>
        <label>
          <span>Mín</span>
          <input
            type="date"
            value={minStr}
            onChange={(e) => setMinStr(e.target.value)}
            onBlur={() => commitFromInput("min")}
            onClick={(e) => e.stopPropagation()}
          />
        </label>

        <span className="dash">—</span>

        <label>
          <span>Máx</span>
          <input
            type="date"
            value={maxStr}
            onChange={(e) => setMaxStr(e.target.value)}
            onBlur={() => commitFromInput("max")}
            onClick={(e) => e.stopPropagation()}
          />
        </label>

        {unitPretty && <span className="unit">{unitPretty}</span>}
      </div>
    </section>
  );
}
