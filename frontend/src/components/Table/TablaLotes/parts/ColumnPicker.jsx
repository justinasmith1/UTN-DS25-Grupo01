// src/components/TablaLotes/parts/ColumnPicker.jsx
import React from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
// Este lo que hace es permitir seleccionar y ordenar columnas visibles en la tabla (implementacion del chino)

function SortableItem({ id, column, checked, disabled, onToggle }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  return (
    <label ref={setNodeRef} style={style}
      className={`tl-check tl-check--sortable ${checked ? 'is-checked' : ''} ${disabled ? 'is-disabled' : ''}`}
      {...attributes}
    >
      <div className="tl-check__drag-handle" {...listeners}><GripVertical size={16} /></div>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onToggle(id, e)} />
      <span>{column.titulo ?? column.header ?? column.id}</span>
    </label>
  );
}

export default function ColumnPicker({ all, selected, onChange, max = 5, onResetVisibleCols }) {
  const totalSel = selected.length;

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const toggle = (id, event) => {
    // Prevenir propagación del evento para evitar que se cierre el popover
    if (event) {
      event.stopPropagation();
    }
    
    const isSel = selected.includes(id);
    if (isSel) onChange(selected.filter((x) => x !== id));
    else {
      if (selected.length >= max) return;
      onChange([...new Set([...selected, id])]);
    }
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      const oldIndex = selected.indexOf(active.id);
      const newIndex = selected.indexOf(over.id);
      onChange(arrayMove(selected, oldIndex, newIndex));
    }
  };

  const selectedColumns = selected.map(id => all.find(c => c.id === id)).filter(Boolean);

  return (
    <div className="tl-popover">
      <div className="tl-popover__header">
        <strong>Columnas</strong>
        <span className={`tl-chip ${totalSel >= max ? 'is-max' : ''}`}>{totalSel}/{max}</span>
      </div>

      <div className="tl-popover__list">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={selected} strategy={verticalListSortingStrategy}>
            {selectedColumns.map((c) => {
              const checked = selected.includes(c.id);
              const disabled = !checked && totalSel >= max;
              return (
                <SortableItem
                  key={c.id}
                  id={c.id}
                  column={c}
                  checked={checked}
                  disabled={disabled}
                  onToggle={(id, event) => toggle(id, event)}
                />
              );
            })}
          </SortableContext>
        </DndContext>

        {selectedColumns.length > 0 && (
          <div className="tl-popover__separator"><span>Columnas disponibles</span></div>
        )}

        {all.filter(c => !selected.includes(c.id)).map((c) => {
          const checked = selected.includes(c.id);
          const disabled = !checked && totalSel >= max;
          return (
            <label key={c.id} className={`tl-check ${checked ? 'is-checked' : ''} ${disabled ? 'is-disabled' : ''}`}>
              <input type="checkbox" checked={checked} disabled={disabled} onChange={(e) => toggle(c.id, e)} />
              <span>{c.titulo ?? c.header ?? c.id}</span>
            </label>
          );
        })}
      </div>

      <button type="button" className="tl-btn tl-btn--ghost" onClick={() => onResetVisibleCols?.()}>
        Restablecer
      </button>
    </div>
  );
}
