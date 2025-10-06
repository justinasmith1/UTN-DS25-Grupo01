// src/components/TablaLotes/parts/PageSizeDropdown.jsx
import React, { useEffect, useRef, useState } from 'react';
// El dropdown simple para elegir la cantidad de filas por pagina

export default function PageSizeDropdown({ value, options, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const onDocClick = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, []);

  const label = String(value);
  return (
    <div className={`tl-dd ${open ? 'is-open' : ''}`} ref={ref}>
      <button
        type="button"
        className="tl-btn tl-btn--ghost tl-btn--columns2 tl-dd__button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        {label}<span className="tl-dd__chev">▾</span>
      </button>
      {open && (
        <div className="tl-dd__menu" role="listbox">
          {options.map((opt) => {
            const l = String(opt);
            return (
              <button
                type="button"
                key={l}
                className={`tl-dd__item ${l === label ? 'is-active' : ''}`}
                onClick={() => { onChange(opt); setOpen(false); }}
              >
                {l}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
