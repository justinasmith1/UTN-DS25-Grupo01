// src/components/Mapa/LoteImageCarousel.jsx
// Carrusel de imágenes para el SidePanel del mapa

import { useState, useEffect } from "react";

const FALLBACK_IMAGE = "/placeholder.svg?width=720&height=360&text=Sin+imagen+disponible";

export default function LoteImageCarousel({ images = [] }) {
  const safeImages = Array.isArray(images) ? images.filter(Boolean) : [];
  const [currentIndex, setCurrentIndex] = useState(0);

  // Asegurar que el índice está dentro del rango válido
  useEffect(() => {
    if (safeImages.length > 0 && currentIndex >= safeImages.length) {
      setCurrentIndex(0);
    }
  }, [safeImages.length, currentIndex]);

  if (!safeImages || safeImages.length === 0) {
    return (
      <div
        style={{
          width: "100%",
          height: "240px",
          borderRadius: "12px",
          background: "#f3f4f6",
          border: "1px solid #e5e7eb",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "12px",
          color: "#6b7280",
        }}
      >
        <svg
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <polyline points="21 15 16 10 5 21" />
        </svg>
        <span style={{ fontSize: "14px", fontWeight: 600 }}>
          Sin imágenes disponibles
        </span>
      </div>
    );
  }

  const hasMultiple = safeImages.length > 1;
  const currentImage = safeImages[currentIndex] || safeImages[0] || FALLBACK_IMAGE;

  const goPrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? safeImages.length - 1 : prev - 1));
  };

  const goNext = () => {
    setCurrentIndex((prev) => (prev === safeImages.length - 1 ? 0 : prev + 1));
  };

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "240px",
        borderRadius: "12px",
        overflow: "hidden",
        background: "#fff",
        border: "1px solid #e5e7eb",
        boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
      }}
    >
      <img
        src={currentImage}
        alt={`Imagen ${currentIndex + 1} de ${safeImages.length}`}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          display: "block",
        }}
        onError={(e) => {
          e.target.src = FALLBACK_IMAGE;
        }}
      />

      {hasMultiple && (
        <>
          {/* Botón anterior */}
          <button
            onClick={goPrevious}
            style={{
              position: "absolute",
              left: "12px",
              top: "50%",
              transform: "translateY(-50%)",
              width: "36px",
              height: "36px",
              borderRadius: "50%",
              background: "rgba(255, 255, 255, 0.9)",
              border: "1px solid #e5e7eb",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#fff";
              e.currentTarget.style.transform = "translateY(-50%) scale(1.05)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.9)";
              e.currentTarget.style.transform = "translateY(-50%)";
            }}
            aria-label="Imagen anterior"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>

          {/* Botón siguiente */}
          <button
            onClick={goNext}
            style={{
              position: "absolute",
              right: "12px",
              top: "50%",
              transform: "translateY(-50%)",
              width: "36px",
              height: "36px",
              borderRadius: "50%",
              background: "rgba(255, 255, 255, 0.9)",
              border: "1px solid #e5e7eb",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#fff";
              e.currentTarget.style.transform = "translateY(-50%) scale(1.05)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.9)";
              e.currentTarget.style.transform = "translateY(-50%)";
            }}
            aria-label="Imagen siguiente"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>

          {/* Indicadores de puntos */}
          <div
            style={{
              position: "absolute",
              bottom: "12px",
              left: "50%",
              transform: "translateX(-50%)",
              display: "flex",
              gap: "6px",
              alignItems: "center",
            }}
          >
            {safeImages.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                style={{
                  width: currentIndex === index ? "24px" : "8px",
                  height: "8px",
                  borderRadius: "4px",
                  background:
                    currentIndex === index
                      ? "rgba(255, 255, 255, 0.95)"
                      : "rgba(255, 255, 255, 0.5)",
                  border: "none",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  padding: 0,
                }}
                aria-label={`Ir a imagen ${index + 1}`}
              />
            ))}
          </div>

          {/* Contador */}
          <div
            style={{
              position: "absolute",
              top: "12px",
              right: "12px",
              background: "rgba(0, 0, 0, 0.6)",
              color: "#fff",
              padding: "4px 10px",
              borderRadius: "12px",
              fontSize: "12px",
              fontWeight: 600,
              backdropFilter: "blur(4px)",
            }}
          >
            {currentIndex + 1} / {safeImages.length}
          </div>
        </>
      )}
    </div>
  );
}

