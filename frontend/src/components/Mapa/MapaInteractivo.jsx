// src/components/Mapa/MapaInteractivo.jsx
import React, { useEffect, useRef, useState } from "react";
import mapaSvg from "../../assets/Mapa La Federala - Interactivo.svg?raw";

function MapaInteractivo({
  onLoteClick,
  variantByMapId = {},
  activeMapIds = [],
  labelByMapId = {},
}) {
  const wrapperRef = useRef(null);
  const [svgInjected, setSvgInjected] = useState(false);

  // Paleta de colores por "variant" visual
  const getColorForVariant = (variant) => {
    const colors = {
      success: "#10B981",
      warn: "#F59E0B",
      info: "#3B82F6",
      indigo: "#6366F1",
      danger: "#EF4444",
      muted: "#6B7280",
    };
    return colors[variant] || colors.muted;
  };

  const getBorderColorForVariant = (variant) => {
    const colors = {
      success: "#059669",
      warn: "#D97706",
      info: "#2563EB",
      indigo: "#4F46E5",
      danger: "#DC2626",
      muted: "#4B5563",
    };
    return colors[variant] || colors.muted;
  };

  // Inyectar SVG solo una vez
  useEffect(() => {
    if (svgInjected) return;
    if (!wrapperRef.current) return;
    
    wrapperRef.current.innerHTML = mapaSvg;
    setSvgInjected(true);
  }, [svgInjected]);

  // Aplicar estilos después de que el SVG esté inyectado
  useEffect(() => {
    if (!svgInjected) return;

    const root = wrapperRef.current;
    if (!root) return;

    const svgRoot = root.querySelector("svg");
    if (!svgRoot) return;

    // Crear filtro de sombra si no existe
    let defs = svgRoot.querySelector("defs");
    if (!defs) {
      defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
      svgRoot.insertBefore(defs, svgRoot.firstChild);
    }
    
      // Crear filtro de sombra visible para lotes grises usando método más robusto
    let shadowFilter = svgRoot.querySelector("#lot-shadow");
    if (shadowFilter) {
      shadowFilter.remove();
    }
    shadowFilter = document.createElementNS("http://www.w3.org/2000/svg", "filter");
    shadowFilter.setAttribute("id", "lot-shadow");
    shadowFilter.setAttribute("x", "-100%");
    shadowFilter.setAttribute("y", "-100%");
    shadowFilter.setAttribute("width", "300%");
    shadowFilter.setAttribute("height", "300%");
    
    // Sombra profesional con múltiples capas para profundidad
    const feGaussianBlur = document.createElementNS("http://www.w3.org/2000/svg", "feGaussianBlur");
    feGaussianBlur.setAttribute("in", "SourceAlpha");
    feGaussianBlur.setAttribute("stdDeviation", "3");
    feGaussianBlur.setAttribute("result", "blur");
    
    const feOffset = document.createElementNS("http://www.w3.org/2000/svg", "feOffset");
    feOffset.setAttribute("in", "blur");
    feOffset.setAttribute("dx", "0");
    feOffset.setAttribute("dy", "2");
    feOffset.setAttribute("result", "offsetBlur");
    
    const feFlood = document.createElementNS("http://www.w3.org/2000/svg", "feFlood");
    feFlood.setAttribute("flood-color", "#000000");
    feFlood.setAttribute("flood-opacity", "0.4");
    feFlood.setAttribute("result", "floodColor");
    
    const feComposite = document.createElementNS("http://www.w3.org/2000/svg", "feComposite");
    feComposite.setAttribute("in", "floodColor");
    feComposite.setAttribute("in2", "offsetBlur");
    feComposite.setAttribute("operator", "in");
    feComposite.setAttribute("result", "shadow");
    
    // Blur sutil en el elemento para bordes suaves y profesionales
    const feGaussianBlurSource = document.createElementNS("http://www.w3.org/2000/svg", "feGaussianBlur");
    feGaussianBlurSource.setAttribute("in", "SourceGraphic");
    feGaussianBlurSource.setAttribute("stdDeviation", "0.3");
    feGaussianBlurSource.setAttribute("result", "blurredSource");
    
    const feMerge = document.createElementNS("http://www.w3.org/2000/svg", "feMerge");
    const feMergeNode1 = document.createElementNS("http://www.w3.org/2000/svg", "feMergeNode");
    feMergeNode1.setAttribute("in", "shadow");
    const feMergeNode2 = document.createElementNS("http://www.w3.org/2000/svg", "feMergeNode");
    feMergeNode2.setAttribute("in", "blurredSource");
    feMerge.appendChild(feMergeNode1);
    feMerge.appendChild(feMergeNode2);
    
    shadowFilter.appendChild(feGaussianBlur);
    shadowFilter.appendChild(feOffset);
    shadowFilter.appendChild(feFlood);
    shadowFilter.appendChild(feComposite);
    shadowFilter.appendChild(feGaussianBlurSource);
    shadowFilter.appendChild(feMerge);
    defs.appendChild(shadowFilter);

    // Crear filtro de sombra más pronunciada para lotes con estado
    let shadowFilterActive = svgRoot.querySelector("#lot-shadow-active");
    if (shadowFilterActive) {
      shadowFilterActive.remove();
    }
    shadowFilterActive = document.createElementNS("http://www.w3.org/2000/svg", "filter");
    shadowFilterActive.setAttribute("id", "lot-shadow-active");
    shadowFilterActive.setAttribute("x", "-100%");
    shadowFilterActive.setAttribute("y", "-100%");
    shadowFilterActive.setAttribute("width", "300%");
    shadowFilterActive.setAttribute("height", "300%");
    
    // Sombra más pronunciada para lotes con estado, manteniendo elegancia
    const feGaussianBlurActive = document.createElementNS("http://www.w3.org/2000/svg", "feGaussianBlur");
    feGaussianBlurActive.setAttribute("in", "SourceAlpha");
    feGaussianBlurActive.setAttribute("stdDeviation", "4");
    feGaussianBlurActive.setAttribute("result", "blur");
    
    const feOffsetActive = document.createElementNS("http://www.w3.org/2000/svg", "feOffset");
    feOffsetActive.setAttribute("in", "blur");
    feOffsetActive.setAttribute("dx", "0");
    feOffsetActive.setAttribute("dy", "3");
    feOffsetActive.setAttribute("result", "offsetBlur");
    
    const feFloodActive = document.createElementNS("http://www.w3.org/2000/svg", "feFlood");
    feFloodActive.setAttribute("flood-color", "#000000");
    feFloodActive.setAttribute("flood-opacity", "0.5");
    feFloodActive.setAttribute("result", "floodColor");
    
    const feCompositeActive = document.createElementNS("http://www.w3.org/2000/svg", "feComposite");
    feCompositeActive.setAttribute("in", "floodColor");
    feCompositeActive.setAttribute("in2", "offsetBlur");
    feCompositeActive.setAttribute("operator", "in");
    feCompositeActive.setAttribute("result", "shadow");
    
    // Blur sutil en el elemento para bordes suaves y profesionales
    const feGaussianBlurSourceActive = document.createElementNS("http://www.w3.org/2000/svg", "feGaussianBlur");
    feGaussianBlurSourceActive.setAttribute("in", "SourceGraphic");
    feGaussianBlurSourceActive.setAttribute("stdDeviation", "0.5");
    feGaussianBlurSourceActive.setAttribute("result", "blurredSource");
    
    const feMergeActive = document.createElementNS("http://www.w3.org/2000/svg", "feMerge");
    const feMergeNode1Active = document.createElementNS("http://www.w3.org/2000/svg", "feMergeNode");
    feMergeNode1Active.setAttribute("in", "shadow");
    const feMergeNode2Active = document.createElementNS("http://www.w3.org/2000/svg", "feMergeNode");
    feMergeNode2Active.setAttribute("in", "blurredSource");
    feMergeActive.appendChild(feMergeNode1Active);
    feMergeActive.appendChild(feMergeNode2Active);
    
    shadowFilterActive.appendChild(feGaussianBlurActive);
    shadowFilterActive.appendChild(feOffsetActive);
    shadowFilterActive.appendChild(feFloodActive);
    shadowFilterActive.appendChild(feCompositeActive);
    shadowFilterActive.appendChild(feGaussianBlurSourceActive);
    shadowFilterActive.appendChild(feMergeActive);
    defs.appendChild(shadowFilterActive);

    // Crear filtro de sombra sutil para texto
    let textShadowFilter = svgRoot.querySelector("#text-shadow");
    if (!textShadowFilter) {
      textShadowFilter = document.createElementNS("http://www.w3.org/2000/svg", "filter");
      textShadowFilter.setAttribute("id", "text-shadow");
      textShadowFilter.setAttribute("x", "-50%");
      textShadowFilter.setAttribute("y", "-50%");
      textShadowFilter.setAttribute("width", "200%");
      textShadowFilter.setAttribute("height", "200%");
      
      const feDropShadow = document.createElementNS("http://www.w3.org/2000/svg", "feDropShadow");
      feDropShadow.setAttribute("dx", "0");
      feDropShadow.setAttribute("dy", "1");
      feDropShadow.setAttribute("stdDeviation", "1.5");
      feDropShadow.setAttribute("flood-opacity", "0.4");
      feDropShadow.setAttribute("flood-color", "#000000");
      
      textShadowFilter.appendChild(feDropShadow);
      defs.appendChild(textShadowFilter);
    }

    const allLotes = svgRoot.querySelectorAll("[id^='Lote']");
    if (allLotes.length === 0) return;

    // Limpiar overlays y textos anteriores
    svgRoot.querySelectorAll("[data-overlay-for]").forEach((el) => el.remove());
    svgRoot.querySelectorAll("text[data-label-for]").forEach((el) => el.remove());

    const activeSet = new Set((activeMapIds || []).filter(Boolean));

    allLotes.forEach((el) => {
      const id = el.id;
      if (!/^Lote[0-9]/.test(id)) return;

      const isActive = activeSet.size === 0 || activeSet.has(id);
      const variant = variantByMapId[id];
      const label = labelByMapId[id];

      // Aplicar gris base a TODOS
      el.style.fill = "#787878";
      el.setAttribute("fill", "#787878");
      el.style.fillOpacity = "1";
      el.setAttribute("fill-opacity", "1");
      // Bordes muy sutiles o sin borde - el blur del filtro los suavizará
      el.style.stroke = "none";
      el.setAttribute("stroke", "none");
      el.style.strokeWidth = "0";
      el.setAttribute("stroke-width", "0");
      
      // Aplicar sombra usando filtro SVG
      el.setAttribute("filter", "url(#lot-shadow)");

      // Interactividad
      el.style.pointerEvents = isActive ? "auto" : "none";
      el.style.cursor = isActive ? "pointer" : "default";
      el.style.opacity = isActive ? "1" : "0.25";

      // Si tiene variant, aplicar color con diseño mejorado
      if (variant) {
        const fillColor = getColorForVariant(variant);
        const borderColor = getBorderColorForVariant(variant);
        el.style.fill = fillColor;
        el.setAttribute("fill", fillColor);
        // Sin borde sólido - el blur del filtro creará el efecto de borde suave
        el.style.stroke = "none";
        el.setAttribute("stroke", "none");
        el.style.strokeWidth = "0";
        el.setAttribute("stroke-width", "0");
        // Aplicar sombra más pronunciada para lotes con estado
        el.setAttribute("filter", "url(#lot-shadow-active)");
      }

      // Agregar número con diseño sutil y bien centrado
      if (label) {
        try {
          const bbox = el.getBBox();
          
          // Calcular el centro geométrico del bounding box
          const cx = bbox.x + bbox.width / 2;
          const cy = bbox.y + bbox.height / 2;

          // Calcular tamaño de fuente más sutil y proporcionado
          const minDimension = Math.min(bbox.width, bbox.height);
          const fontSize = Math.max(10, Math.min(16, minDimension * 0.28));

          const textEl = document.createElementNS("http://www.w3.org/2000/svg", "text");
          textEl.setAttribute("x", cx.toString());
          textEl.setAttribute("y", cy.toString());
          textEl.setAttribute("text-anchor", "middle");
          textEl.setAttribute("dominant-baseline", "middle");
          textEl.setAttribute("data-label-for", id);
          textEl.setAttribute("font-size", fontSize.toString());
          textEl.setAttribute("font-weight", "600");
          textEl.setAttribute("font-family", "Arial, sans-serif");
          
          // Texto blanco con borde negro para mejor contraste y legibilidad
          textEl.setAttribute("fill", "#ffffff");
          textEl.setAttribute("stroke", "#000000");
          textEl.setAttribute("stroke-width", "1.2");
          textEl.setAttribute("stroke-linejoin", "round");
          textEl.setAttribute("paint-order", "stroke fill");
          textEl.setAttribute("opacity", "1");
          
          // Sombra sutil para el texto
          textEl.setAttribute("filter", "url(#text-shadow)");
          textEl.setAttribute("pointer-events", "none");
          textEl.textContent = label;

          // Insertar el texto en el mismo grupo que el lote para mantener el orden
          if (el.parentNode) {
            el.parentNode.appendChild(textEl);
          } else {
            svgRoot.appendChild(textEl);
          }
          
          // Ajustar centrado después de que el texto se renderice
          requestAnimationFrame(() => {
            try {
              // Obtener el bounding box real del texto renderizado
              const textBBox = textEl.getBBox();
              
              // Calcular el centro real del texto
              const textCenterX = textBBox.x + textBBox.width / 2;
              const textCenterY = textBBox.y + textBBox.height / 2;
              
              // Calcular la diferencia entre el centro deseado y el centro real
              const offsetX = cx - textCenterX;
              const offsetY = cy - textCenterY;
              
              // Ajustar la posición para centrar perfectamente
              const adjustedX = parseFloat(textEl.getAttribute("x")) + offsetX;
              const adjustedY = parseFloat(textEl.getAttribute("y")) + offsetY;
              
              textEl.setAttribute("x", adjustedX.toString());
              textEl.setAttribute("y", adjustedY.toString());
            } catch (e) {
              // Si falla el ajuste, mantener la posición original
            }
          });
        } catch (err) {
          // Silently fail
        }
      }
    });
  }, [svgInjected, variantByMapId, activeMapIds, labelByMapId]);

  // Manejo de click en el SVG:
  // busco el shape base cuyo id empieza con "Lote" y paso ese mapId hacia arriba.
  const handleSvgClick = (event) => {
    const loteElement = event.target.closest("[id^='Lote']");
    if (!loteElement) return;

    const mapId = loteElement.id;
    if (typeof onLoteClick === "function") {
      onLoteClick(mapId);
    }
  };

  return (
    <div
      ref={wrapperRef}
      className="mapa-svg-wrapper"
      onClick={handleSvgClick}
    />
  );
}

export default MapaInteractivo;
