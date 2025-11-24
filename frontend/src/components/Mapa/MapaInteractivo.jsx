// src/components/Mapa/MapaInteractivo.jsx
import React, { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import mapaSvg from "../../assets/Mapa La Federala - Interactivo.svg?raw";

function MapaInteractivo({
  onLoteClick,
  variantByMapId = {},
  activeMapIds = [],
  labelByMapId = {},
  estadoByMapId = {},
}) {
  const wrapperRef = useRef(null);
  const [svgInjected, setSvgInjected] = useState(false);

  // Paleta de colores por "variant" visual (igual que en TablaLotes.css - colores del dashboard)
  const getColorForVariant = (variant, estado = null) => {
    // VENDIDO tiene un color amarillo brillante especial, diferente de EN PROMOCION
    if (estado && estado.toUpperCase() === "VENDIDO") {
      return "#FBBF24"; // Amarillo brillante (más claro que EN PROMOCION)
    }
    
    const colors = {
      success: "#18794E", // color del texto en .tl-badge--success
      warn: "#9A5C00",    // color del texto en .tl-badge--warn (EN PROMOCION)
      info: "#2952CC",    // color del texto en .tl-badge--info
      indigo: "#5B6BFF",  // color del texto en .tl-badge--indigo
      danger: "#C23B3B",  // color del texto en .tl-badge--danger
      muted: "#475467",   // color del texto en .tl-badge--muted
    };
    return colors[variant] || colors.muted;
  };

  const getBorderColorForVariant = (variant, estado = null) => {
    // VENDIDO tiene un borde amarillo oscuro especial
    if (estado && estado.toUpperCase() === "VENDIDO") {
      return "#D97706"; // Amarillo/naranja oscuro para borde de VENDIDO
    }
    
    // Bordes más oscuros basados en los colores del dashboard
    const colors = {
      success: "#11633E", // versión más oscura de #18794E
      warn: "#7A4B00",    // versión más oscura de #9A5C00 (EN PROMOCION)
      info: "#1E3A8A",    // versión más oscura de #2952CC
      indigo: "#4338CA",  // versión más oscura de #5B6BFF
      danger: "#991B1B",  // versión más oscura de #C23B3B
      muted: "#334155",   // versión más oscura de #475467
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
    
    // Hacer que el SVG tenga fondo transparente
    svgRoot.style.backgroundColor = "transparent";
    
    // Eliminar el rect de fondo verde completo si existe
    const fondoVerdeRect = svgRoot.querySelector("rect[data-fondo-verde-completo]");
    if (fondoVerdeRect) {
      fondoVerdeRect.remove();
    }

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

    // Filtro específico para zonas comunes: estela/glow suave, sin línea visible
    // Usa SourceAlpha como el filtro que funciona, pero sin incluir SourceGraphic en el merge
    let commonAreaGlowFilter = svgRoot.querySelector("#common-area-glow");
    if (commonAreaGlowFilter) {
      commonAreaGlowFilter.remove();
    }
    commonAreaGlowFilter = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "filter"
    );
    commonAreaGlowFilter.setAttribute("id", "common-area-glow");
    commonAreaGlowFilter.setAttribute("x", "-100%");
    commonAreaGlowFilter.setAttribute("y", "-100%");
    commonAreaGlowFilter.setAttribute("width", "300%");
    commonAreaGlowFilter.setAttribute("height", "300%");

    // Blur grande para el glow suave exterior - reducido para menos difusión
    const feGaussianBlurCommon = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "feGaussianBlur"
    );
    feGaussianBlurCommon.setAttribute("in", "SourceAlpha");
    feGaussianBlurCommon.setAttribute("stdDeviation", "8");
    feGaussianBlurCommon.setAttribute("result", "alphaBlur");

    // Blur pequeño para brillo concentrado en los bordes
    const feGaussianBlurBorder = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "feGaussianBlur"
    );
    feGaussianBlurBorder.setAttribute("in", "SourceAlpha");
    feGaussianBlurBorder.setAttribute("stdDeviation", "4");
    feGaussianBlurBorder.setAttribute("result", "alphaBlurBorder");

    // Color celeste para el glow exterior - más suave y sutil
    const feFloodCommon = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "feFlood"
    );
    feFloodCommon.setAttribute("flood-color", "#38BDF8");
    feFloodCommon.setAttribute("flood-opacity", "0.3");
    feFloodCommon.setAttribute("result", "celesteColor");

    // Color celeste para los bordes - sutil pero más visible que el exterior
    const feFloodBorder = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "feFlood"
    );
    feFloodBorder.setAttribute("flood-color", "#38BDF8");
    feFloodBorder.setAttribute("flood-opacity", "0.5");
    feFloodBorder.setAttribute("result", "celesteBorder");

    // Combinar el blur grande con el color celeste suave
    const feCompositeCommon = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "feComposite"
    );
    feCompositeCommon.setAttribute("in", "celesteColor");
    feCompositeCommon.setAttribute("in2", "alphaBlur");
    feCompositeCommon.setAttribute("operator", "in");
    feCompositeCommon.setAttribute("result", "coloredGlow");

    // Combinar el blur pequeño con el color celeste brillante (bordes)
    const feCompositeBorder = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "feComposite"
    );
    feCompositeBorder.setAttribute("in", "celesteBorder");
    feCompositeBorder.setAttribute("in2", "alphaBlurBorder");
    feCompositeBorder.setAttribute("operator", "in");
    feCompositeBorder.setAttribute("result", "coloredBorder");

    // Combinar el glow brillante de bordes sobre el glow suave
    const feCompositeCombine = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "feComposite"
    );
    feCompositeCombine.setAttribute("in", "coloredBorder");
    feCompositeCombine.setAttribute("in2", "coloredGlow");
    feCompositeCombine.setAttribute("operator", "over");
    feCompositeCombine.setAttribute("result", "finalGlow");

    // Solo mostrar el glow combinado, NO incluir SourceGraphic (así no se ve la línea del stroke ni el fill)
    const feMergeCommon = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "feMerge"
    );
    const feMergeNodeCommon1 = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "feMergeNode"
    );
    feMergeNodeCommon1.setAttribute("in", "finalGlow");

    feMergeCommon.appendChild(feMergeNodeCommon1);

    commonAreaGlowFilter.appendChild(feGaussianBlurCommon);
    commonAreaGlowFilter.appendChild(feGaussianBlurBorder);
    commonAreaGlowFilter.appendChild(feFloodCommon);
    commonAreaGlowFilter.appendChild(feFloodBorder);
    commonAreaGlowFilter.appendChild(feCompositeCommon);
    commonAreaGlowFilter.appendChild(feCompositeBorder);
    commonAreaGlowFilter.appendChild(feCompositeCombine);
    commonAreaGlowFilter.appendChild(feMergeCommon);
    defs.appendChild(commonAreaGlowFilter);

    // Crear filtro de sombra para el rect de fondo del mapa
    let mapaShadowFilter = svgRoot.querySelector("#mapa-shadow-filter");
    if (mapaShadowFilter) {
      mapaShadowFilter.remove();
    }
    mapaShadowFilter = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "filter"
    );
    mapaShadowFilter.setAttribute("id", "mapa-shadow-filter");
    mapaShadowFilter.setAttribute("x", "-50%");
    mapaShadowFilter.setAttribute("y", "-50%");
    mapaShadowFilter.setAttribute("width", "200%");
    mapaShadowFilter.setAttribute("height", "200%");

    const feGaussianBlurMapa = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "feGaussianBlur"
    );
    feGaussianBlurMapa.setAttribute("in", "SourceAlpha");
    feGaussianBlurMapa.setAttribute("stdDeviation", "8");
    feGaussianBlurMapa.setAttribute("result", "blur");

    const feOffsetMapa = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "feOffset"
    );
    feOffsetMapa.setAttribute("in", "blur");
    feOffsetMapa.setAttribute("dx", "0");
    feOffsetMapa.setAttribute("dy", "3");
    feOffsetMapa.setAttribute("result", "offsetBlur");

    const feFloodMapa = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "feFlood"
    );
    feFloodMapa.setAttribute("flood-color", "#0D3730");
    feFloodMapa.setAttribute("flood-opacity", "0.5");
    feFloodMapa.setAttribute("result", "floodColor");

    const feCompositeMapa = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "feComposite"
    );
    feCompositeMapa.setAttribute("in", "floodColor");
    feCompositeMapa.setAttribute("in2", "offsetBlur");
    feCompositeMapa.setAttribute("operator", "in");
    feCompositeMapa.setAttribute("result", "coloredShadow");

    const feMergeMapa = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "feMerge"
    );
    const feMergeNodeMapa1 = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "feMergeNode"
    );
    feMergeNodeMapa1.setAttribute("in", "coloredShadow");
    const feMergeNodeMapa2 = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "feMergeNode"
    );
    feMergeNodeMapa2.setAttribute("in", "SourceGraphic");

    feMergeMapa.appendChild(feMergeNodeMapa1);
    feMergeMapa.appendChild(feMergeNodeMapa2);
    mapaShadowFilter.appendChild(feGaussianBlurMapa);
    mapaShadowFilter.appendChild(feOffsetMapa);
    mapaShadowFilter.appendChild(feFloodMapa);
    mapaShadowFilter.appendChild(feCompositeMapa);
    mapaShadowFilter.appendChild(feMergeMapa);
    defs.appendChild(mapaShadowFilter);

    // Aplicar la sombra directamente al rect de fondo del mapa (segundo nivel)
    const fondoMapaGroup = svgRoot.querySelector("g[id='Mapa - Fondo (Imagen)']");
    if (fondoMapaGroup) {
      // Remover el atributo filter antiguo que aplica la sombra global
      fondoMapaGroup.removeAttribute("filter");
      fondoMapaGroup.style.filter = "none";
      
      // Aplicar el nuevo filtro de sombra directamente al rect de fondo
      const fondoRect = fondoMapaGroup.querySelector("rect");
      if (fondoRect) {
        fondoRect.setAttribute("filter", "url(#mapa-shadow-filter)");
      }
    }
    
    // Eliminar el rect de fondo verde si existe (ya no es necesario)
    const fondoVerde = svgRoot.querySelector("rect[data-fondo-verde]");
    if (fondoVerde) {
      fondoVerde.remove();
    }

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
      const estado = estadoByMapId[id];

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
          fillColor = getColorForVariant(variant, estado);
          borderColor = getBorderColorForVariant(variant, estado);
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

    // ---------- ZONAS COMUNES (espacios comunes: transparentes por defecto, glow en hover) ----------
    const zonasComunesGroup = svgRoot.querySelector("g[id='Espacios Comunes']");
    if (zonasComunesGroup) {
      const zonasComunes = zonasComunesGroup.querySelectorAll("path");
      
      zonasComunes.forEach((zona) => {
        // Estilo base: transparente para que se vea la imagen de fondo
        zona.style.fill = "transparent";
        zona.setAttribute("fill", "transparent");
        zona.style.stroke = "none";
        zona.setAttribute("stroke", "none");
        zona.style.opacity = "1";
        zona.style.cursor = "pointer";
        zona.style.pointerEvents = "auto";
        
        // Sin filtro por defecto (invisible)
        zona.removeAttribute("filter");
        
        // Transformaciones para hover
        zona.style.transformBox = "fill-box";
        zona.style.transformOrigin = "50% 50%";
        zona.style.transform = "translateY(0px) scale(1)";
        zona.style.backfaceVisibility = "hidden";
        
        // Handlers de hover: mostrar solo estela/glow (sin línea visible)
        const zonaHoverEnter = () => {
          gsap.killTweensOf(zona);
          zona.style.willChange = "transform, filter";
          
          // IMPORTANTE: Para que SourceAlpha capture el elemento, necesitamos:
          // 1. Stroke visible (para que SourceAlpha lo capture) - un poco más grueso para mejor definición
          zona.setAttribute("stroke", "#38BDF8");
          zona.setAttribute("stroke-width", "4");
          zona.setAttribute("stroke-opacity", "1");
          zona.style.stroke = "#38BDF8";
          
          // 2. Fill con alpha muy bajo (casi invisible pero presente para SourceAlpha)
          // SourceAlpha necesita que haya alpha, así que usamos fill con opacity muy baja
          zona.setAttribute("fill", "#38BDF8");
          zona.setAttribute("fill-opacity", "0.001"); // Casi invisible pero presente para SourceAlpha
          zona.style.fill = "#38BDF8";
          zona.style.fillOpacity = "0.001";
          
          // Aplicar el filtro - solo mostrará el glow blurizado
          // El fill casi transparente no se verá, pero permite que SourceAlpha funcione
          zona.setAttribute("filter", "url(#common-area-glow)");
          zona.style.filter = "url(#common-area-glow)";
          
          // Animación suave
          gsap.to(zona, {
            scale: 1.01,
            duration: 0.2,
            ease: "power2.out",
            force3D: true,
          });
        };
        
        const zonaHoverLeave = () => {
          gsap.killTweensOf(zona);
          
          gsap.to(zona, {
            scale: 1,
            duration: 0.15,
            ease: "power2.out",
            force3D: true,
            onComplete: () => {
              // Volver a estado invisible
              zona.setAttribute("stroke", "none");
              zona.style.stroke = "none";
              zona.removeAttribute("stroke-width");
              zona.removeAttribute("stroke-opacity");
              zona.removeAttribute("filter");
              zona.style.filter = "none";
              zona.style.fill = "transparent";
              zona.setAttribute("fill", "transparent");
              zona.setAttribute("fill-opacity", "0");
              zona.style.fillOpacity = "0";
              zona.style.willChange = "auto";
            },
          });
        };
        
        // Limpiar handlers anteriores si existen
        if (zona._hoverEnterHandler) {
          zona.removeEventListener("mouseenter", zona._hoverEnterHandler);
        }
        if (zona._hoverLeaveHandler) {
          zona.removeEventListener("mouseleave", zona._hoverLeaveHandler);
        }
        
        zona.addEventListener("mouseenter", zonaHoverEnter);
        zona.addEventListener("mouseleave", zonaHoverLeave);
        
        zona._hoverEnterHandler = zonaHoverEnter;
        zona._hoverLeaveHandler = zonaHoverLeave;
      });
    }
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
