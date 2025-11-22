// src/components/Mapa/MapaInteractivo.jsx
import React, { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
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

    // ---------- DEFINICIÓN DE FILTROS (sombras) ----------

    let defs = svgRoot.querySelector("defs");
    if (!defs) {
      defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
      svgRoot.insertBefore(defs, svgRoot.firstChild);
    }

    // Sombra base para lotes grises
    let shadowFilter = svgRoot.querySelector("#lot-shadow");
    if (shadowFilter) {
      shadowFilter.remove();
    }
    shadowFilter = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "filter"
    );
    shadowFilter.setAttribute("id", "lot-shadow");
    shadowFilter.setAttribute("x", "-100%");
    shadowFilter.setAttribute("y", "-100%");
    shadowFilter.setAttribute("width", "300%");
    shadowFilter.setAttribute("height", "300%");

    const feGaussianBlur = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "feGaussianBlur"
    );
    feGaussianBlur.setAttribute("in", "SourceAlpha");
    feGaussianBlur.setAttribute("stdDeviation", "2");
    feGaussianBlur.setAttribute("result", "blur");

    const feOffset = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "feOffset"
    );
    feOffset.setAttribute("in", "blur");
    feOffset.setAttribute("dx", "0");
    feOffset.setAttribute("dy", "1.5");
    feOffset.setAttribute("result", "offsetBlur");

    const feFlood = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "feFlood"
    );
    feFlood.setAttribute("flood-color", "#000000");
    feFlood.setAttribute("flood-opacity", "0.3");
    feFlood.setAttribute("result", "floodColor");

    const feComposite = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "feComposite"
    );
    feComposite.setAttribute("in", "floodColor");
    feComposite.setAttribute("in2", "offsetBlur");
    feComposite.setAttribute("operator", "in");
    feComposite.setAttribute("result", "shadow");

    const feGaussianBlurSource = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "feGaussianBlur"
    );
    feGaussianBlurSource.setAttribute("in", "SourceGraphic");
    feGaussianBlurSource.setAttribute("stdDeviation", "0.3");
    feGaussianBlurSource.setAttribute("result", "blurredSource");

    const feMerge = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "feMerge"
    );
    const feMergeNode1 = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "feMergeNode"
    );
    feMergeNode1.setAttribute("in", "shadow");
    const feMergeNode2 = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "feMergeNode"
    );
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

    // Sombra para lotes con estado (más marcada)
    let shadowFilterActive = svgRoot.querySelector("#lot-shadow-active");
    if (shadowFilterActive) {
      shadowFilterActive.remove();
    }
    shadowFilterActive = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "filter"
    );
    shadowFilterActive.setAttribute("id", "lot-shadow-active");
    shadowFilterActive.setAttribute("x", "-100%");
    shadowFilterActive.setAttribute("y", "-100%");
    shadowFilterActive.setAttribute("width", "300%");
    shadowFilterActive.setAttribute("height", "300%");

    const feGaussianBlurActive = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "feGaussianBlur"
    );
    feGaussianBlurActive.setAttribute("in", "SourceAlpha");
    feGaussianBlurActive.setAttribute("stdDeviation", "3");
    feGaussianBlurActive.setAttribute("result", "blur");

    const feOffsetActive = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "feOffset"
    );
    feOffsetActive.setAttribute("in", "blur");
    feOffsetActive.setAttribute("dx", "0");
    feOffsetActive.setAttribute("dy", "2.5");
    feOffsetActive.setAttribute("result", "offsetBlur");

    const feFloodActive = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "feFlood"
    );
    feFloodActive.setAttribute("flood-color", "#000000");
    feFloodActive.setAttribute("flood-opacity", "0.45");
    feFloodActive.setAttribute("result", "floodColor");

    const feCompositeActive = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "feComposite"
    );
    feCompositeActive.setAttribute("in", "floodColor");
    feCompositeActive.setAttribute("in2", "offsetBlur");
    feCompositeActive.setAttribute("operator", "in");
    feCompositeActive.setAttribute("result", "shadow");

    const feGaussianBlurSourceActive = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "feGaussianBlur"
    );
    feGaussianBlurSourceActive.setAttribute("in", "SourceGraphic");
    feGaussianBlurSourceActive.setAttribute("stdDeviation", "0.4");
    feGaussianBlurSourceActive.setAttribute("result", "blurredSource");

    const feMergeActive = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "feMerge"
    );
    const feMergeNode1Active = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "feMergeNode"
    );
    feMergeNode1Active.setAttribute("in", "shadow");
    const feMergeNode2Active = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "feMergeNode"
    );
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

    // Filtro de sombra sutil para texto
    let textShadowFilter = svgRoot.querySelector("#text-shadow");
    if (!textShadowFilter) {
      textShadowFilter = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "filter"
      );
      textShadowFilter.setAttribute("id", "text-shadow");
      textShadowFilter.setAttribute("x", "-50%");
      textShadowFilter.setAttribute("y", "-50%");
      textShadowFilter.setAttribute("width", "200%");
      textShadowFilter.setAttribute("height", "200%");

      const feDropShadow = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "feDropShadow"
      );
      feDropShadow.setAttribute("dx", "0");
      feDropShadow.setAttribute("dy", "1");
      feDropShadow.setAttribute("stdDeviation", "1.2");
      feDropShadow.setAttribute("flood-opacity", "0.45");
      feDropShadow.setAttribute("flood-color", "#000000");

      textShadowFilter.appendChild(feDropShadow);
      defs.appendChild(textShadowFilter);
    }

    // Filtro de glow celeste uniforme para hover
    let strokeGlowFilter = svgRoot.querySelector("#lot-stroke-glow");
    if (strokeGlowFilter) {
      strokeGlowFilter.remove();
    }
    strokeGlowFilter = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "filter"
    );
    strokeGlowFilter.setAttribute("id", "lot-stroke-glow");
    strokeGlowFilter.setAttribute("x", "-50%");
    strokeGlowFilter.setAttribute("y", "-50%");
    strokeGlowFilter.setAttribute("width", "200%");
    strokeGlowFilter.setAttribute("height", "200%");

    // Blur sobre el alpha del lote (solo la forma, no el color)
    const feGaussianBlurGlow = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "feGaussianBlur"
    );
    feGaussianBlurGlow.setAttribute("in", "SourceAlpha");
    feGaussianBlurGlow.setAttribute("stdDeviation", "3");
    feGaussianBlurGlow.setAttribute("result", "alphaBlur");

    // Color celeste fijo para el glow
    const feFloodGlow = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "feFlood"
    );
    feFloodGlow.setAttribute("flood-color", "#38BDF8");
    feFloodGlow.setAttribute("flood-opacity", "0.8");
    feFloodGlow.setAttribute("result", "celesteGlow");

    // Combinar el blur del alpha con el color celeste
    const feCompositeGlow = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "feComposite"
    );
    feCompositeGlow.setAttribute("in", "celesteGlow");
    feCompositeGlow.setAttribute("in2", "alphaBlur");
    feCompositeGlow.setAttribute("operator", "in");
    feCompositeGlow.setAttribute("result", "coloredGlow");

    // Combinar el glow celeste con el lote original
    const feMergeGlow = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "feMerge"
    );
    const feMergeNodeGlow1 = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "feMergeNode"
    );
    feMergeNodeGlow1.setAttribute("in", "coloredGlow");
    const feMergeNodeGlow2 = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "feMergeNode"
    );
    feMergeNodeGlow2.setAttribute("in", "SourceGraphic");

    feMergeGlow.appendChild(feMergeNodeGlow1);
    feMergeGlow.appendChild(feMergeNodeGlow2);

    strokeGlowFilter.appendChild(feGaussianBlurGlow);
    strokeGlowFilter.appendChild(feFloodGlow);
    strokeGlowFilter.appendChild(feCompositeGlow);
    strokeGlowFilter.appendChild(feMergeGlow);
    defs.appendChild(strokeGlowFilter);

    const allLotes = svgRoot.querySelectorAll("[id^='Lote']");
    if (allLotes.length === 0) return;

    // Limpiar overlays y textos anteriores
    svgRoot.querySelectorAll("[data-overlay-for]").forEach((el) => el.remove());
    svgRoot
      .querySelectorAll("text[data-label-for]")
      .forEach((el) => el.remove());

    const activeSet = new Set((activeMapIds || []).filter(Boolean));

    allLotes.forEach((el) => {
      const id = el.id;
      if (!/^Lote[0-9]/.test(id)) return;

      // Solo es activo si está en activeMapIds (sin caso especial de "vacío = todos activos")
      const isActive = activeSet.has(id);
      const variant = variantByMapId[id];
      const label = labelByMapId[id];

      // ---------- ESTILO BASE DEL LOTE ----------
      const hasVariant = Boolean(variant);
      
      // Colores para lotes no activos (gris muted consistente)
      const DISABLED_FILL = "#9CA3AF";
      const DISABLED_STROKE = "#6B7280";
      
      // Determinar colores según si está activo o no
      let fillColor, borderColor, strokeWidth, filter, opacity;
      
      if (isActive) {
        // Lote activo: usar colores según tenga variant o no
        if (hasVariant) {
          fillColor = getColorForVariant(variant);
          borderColor = getBorderColorForVariant(variant);
          strokeWidth = "1.6";
          filter = "url(#lot-shadow-active)";
        } else {
          // Lote activo sin variant: estilo base gris neutro
          fillColor = "#9CA3AF";
          borderColor = "#4B5563";
          strokeWidth = "1.1";
          filter = "url(#lot-shadow)";
        }
        opacity = "1";
      } else {
        // Lote no activo: siempre gris muted sólido, sin importar variant
        fillColor = DISABLED_FILL;
        borderColor = DISABLED_STROKE;
        strokeWidth = "1.6";
        filter = "url(#lot-shadow)";
        opacity = "1"; // opacidad completa para bloque sólido (sin transparencia)
      }

      el.style.fill = fillColor;
      el.setAttribute("fill", fillColor);
      el.style.fillOpacity = "1";
      el.setAttribute("fill-opacity", "1");

      // Bordes sutiles (siempre el mismo estilo, cambia solo el color)
      el.style.stroke = borderColor;
      el.setAttribute("stroke", borderColor);
      el.style.strokeWidth = strokeWidth;
      el.setAttribute("stroke-width", strokeWidth);

      el.setAttribute("filter", filter);
      // Guardar el filtro base para restaurarlo después del hover
      const baseFilter = filter;

      // Agregar atributo data-active para controlar clicks
      el.setAttribute("data-active", isActive ? "true" : "false");

      // Interactividad: pointerEvents siempre "auto" para que el hover funcione en todos los lotes
      el.style.pointerEvents = "auto";
      el.style.cursor = isActive ? "pointer" : "default";
      el.style.opacity = opacity;

      // ---------- TRANSICIONES Y ORIGEN DE TRANSFORM ----------
      el.style.transformBox = "fill-box";
      el.style.transformOrigin = "50% 50%";
      el.style.transform = "translateY(0px) scale(1)";
      el.style.backfaceVisibility = "hidden";
      el.style.perspective = "1000px";
      el.style.contain = "layout style paint";
      el.style.willChange = "auto";

      // ---------- NÚMERO DEL LOTE (crear antes de configurar hover) ----------
      // Buscar o crear el texto del lote
      let textEl = svgRoot.querySelector(`text[data-label-for="${id}"]`);
      
      if (label) {
        try {
          // Si el texto no existe, crearlo
          if (!textEl) {
            const bbox = el.getBBox();

            const cx = bbox.x + bbox.width / 2;
            const cy = bbox.y + bbox.height / 2;

            const minDimension = Math.min(bbox.width, bbox.height);
            const fontSize = Math.max(10, Math.min(16, minDimension * 0.28));

            textEl = document.createElementNS(
              "http://www.w3.org/2000/svg",
              "text"
            );
            textEl.setAttribute("x", cx.toString());
            textEl.setAttribute("y", cy.toString());
            textEl.setAttribute("text-anchor", "middle");
            textEl.setAttribute("dominant-baseline", "middle");
            textEl.setAttribute("data-label-for", id);
            textEl.setAttribute("font-size", fontSize.toString());
            // Guardar el tamaño original para poder restaurarlo después
            textEl._originalFontSize = fontSize;
            textEl.setAttribute(
              "font-family",
              'Manrope, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
            );
            textEl.setAttribute("font-weight", "700");
            textEl.setAttribute("letter-spacing", "0.05em");
            textEl.setAttribute("fill", "#ffffff");
            textEl.setAttribute("stroke", "none");
            textEl.setAttribute("filter", "url(#text-shadow)");
            textEl.setAttribute("pointer-events", "none");
            // Opacidad siempre 1 para que el texto sea claramente legible en todos los casos
            textEl.setAttribute("opacity", "1");
            textEl.style.opacity = "1";
            textEl.textContent = label;
            
            // Configurar la misma animación que el fondo del lote
            textEl.style.transformOrigin = "50% 50%";
            textEl.style.transition = "transform 50ms cubic-bezier(0.4, 0, 0.2, 1)";
            textEl.style.transform = "translate3d(0, 0, 0) scale(1)";
            textEl.style.backfaceVisibility = "hidden";
            textEl.style.perspective = "1000px";
            textEl.style.willChange = "auto";

            if (el.parentNode) {
              el.parentNode.appendChild(textEl);
            } else {
              svgRoot.appendChild(textEl);
            }

            // Ajuste fino de centrado después de renderizar
            requestAnimationFrame(() => {
              try {
                const textBBox = textEl.getBBox();
                const textCenterX = textBBox.x + textBBox.width / 2;
                const textCenterY = textBBox.y + textBBox.height / 2;

                const offsetX = cx - textCenterX;
                const offsetY = cy - textCenterY;

                const adjustedX =
                  parseFloat(textEl.getAttribute("x") || "0") + offsetX;
                const adjustedY =
                  parseFloat(textEl.getAttribute("y") || "0") + offsetY;

                textEl.setAttribute("x", adjustedX.toString());
                textEl.setAttribute("y", adjustedY.toString());
              } catch {
                // si falla el ajuste, dejamos la posición original
              }
            });
          } else {
            // Si ya existe, actualizar el contenido y asegurar que tenga las propiedades de animación
            textEl.textContent = label;
            // Guardar el tamaño original si no está guardado
            if (!textEl._originalFontSize) {
              const currentSize = parseFloat(textEl.getAttribute("font-size"));
              textEl._originalFontSize = currentSize || 12;
            }
            // Actualizar a Manrope
            textEl.setAttribute(
              "font-family",
              'Manrope, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
            );
            textEl.setAttribute("font-weight", "700");
            textEl.setAttribute("letter-spacing", "0.05em");
            textEl.setAttribute("fill", "#ffffff");
            textEl.setAttribute("filter", "url(#text-shadow)");
            // Opacidad siempre 1 para que el texto sea claramente legible en todos los casos
            textEl.setAttribute("opacity", "1");
            textEl.style.opacity = "1";
            textEl.style.transformOrigin = "50% 50%";
            textEl.style.transition = "transform 50ms cubic-bezier(0.4, 0, 0.2, 1), font-size 50ms cubic-bezier(0.4, 0, 0.2, 1)";
            textEl.style.transform = "translate3d(0, 0, 0) scale(1)";
            textEl.style.backfaceVisibility = "hidden";
            textEl.style.perspective = "1000px";
            textEl.style.willChange = "auto";
          }
          
          // Guardar referencia al texto en el elemento del lote para acceso directo
          el._textElement = textEl;
        } catch {
          // Silently fail
        }
      } else {
        // Si no hay label, remover el texto si existe
        if (textEl) {
          textEl.remove();
        }
        delete el._textElement;
      }

      // ---------- HOVER (para todos los lotes, activos y desactivados) ----------
      // Primero limpio handlers anteriores para no duplicar listeners
      if (el._hoverEnterHandler) {
        el.removeEventListener("mouseenter", el._hoverEnterHandler);
      }
      if (el._hoverLeaveHandler) {
        el.removeEventListener("mouseleave", el._hoverLeaveHandler);
      }

      // Hover funciona para todos los lotes (activos y desactivados)
      const hoverEnter = () => {
        gsap.killTweensOf(el);
        el.style.willChange = "transform, filter";
        
        // Aplicar filtro de glow celeste uniforme
        el.setAttribute("filter", "url(#lot-stroke-glow)");
        
        // Animar con GSAP - más fluido con mejor ease y duración
        gsap.to(el, {
          scale: 1.04,
          y: -2,
          duration: 0.25,
          ease: "power2.out",
          force3D: true,
        });
      };

      const hoverLeave = () => {
        gsap.killTweensOf(el);
        
        gsap.to(el, {
          scale: 1,
          y: 0,
          duration: 0.2,
          ease: "power2.out",
          force3D: true,
          onComplete: () => {
            // Restaurar el filtro base
            el.setAttribute("filter", baseFilter);
            el.style.willChange = "auto";
          },
        });
      };

      el.addEventListener("mouseenter", hoverEnter);
      el.addEventListener("mouseleave", hoverLeave);

      el._hoverEnterHandler = hoverEnter;
      el._hoverLeaveHandler = hoverLeave;
    });
  }, [svgInjected, variantByMapId, activeMapIds, labelByMapId]);

  // Click en el SVG: busco el shape base cuyo id empieza con "Lote"
  const handleSvgClick = (event) => {
    const loteElement = event.target.closest("[id^='Lote']");
    if (!loteElement) return;

    // Verificar si el lote está activo antes de permitir el click
    const isActive = loteElement.getAttribute("data-active") === "true";
    if (!isActive) {
      // Lote desactivado: no ejecutar click, pero permitir hover
      return;
    }

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
