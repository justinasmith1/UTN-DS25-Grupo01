// src/pages/Ventas.jsx
// Objetivo de la pagina: listar ventas, con filtros y acciones según permisos

import { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../app/providers/AuthProvider";
import { can, PERMISSIONS } from "../lib/auth/rbac";

import { getAllVentas } from "../lib/api/ventas";
import { getAllPersonas } from "../lib/api/personas";
import { getAllInmobiliarias } from "../lib/api/inmobiliarias";

import TablaVentas from "../components/Table/TablaVentas/TablaVentas";
import FilterBarVentas from "../components/FilterBar/FilterBarVentas";
import { applyVentaFilters } from "../utils/applyVentaFilters";

/** Busca el primer array “razonable” dentro de una respuesta heterogénea */
const pickArray = (resp, candidates = []) => {
  if (!resp) return [];
  if (Array.isArray(resp)) return resp;
  if (resp.data && Array.isArray(resp.data)) return resp.data;
  if (resp.items && Array.isArray(resp.items)) return resp.items;

  // Buscar por claves conocidas dentro de data o raíz
  const buckets = [
    ...(candidates || []),                 // ej: ['personas', 'inmobiliarias']
    "results",
    "rows",
    "list",
  ];

  for (const key of buckets) {
    if (resp[key] && Array.isArray(resp[key])) return resp[key];
    if (resp.data && resp.data[key] && Array.isArray(resp.data[key])) return resp.data[key];
  }

  return [];
};

/** Construye "Nombre Apellido" desde distintas variantes de campos */
const buildFullName = (p) => {
  if (!p) return null;
  const nombre =
    p.nombre ?? p.firstName ?? p.name ?? p.nombrePersona ?? null;
  const apellido =
    p.apellido ?? p.lastName ?? p.surname ?? p.apellidoPersona ?? null;
  const full = [nombre, apellido].filter(Boolean).join(" ").trim();
  return full || p.fullName || p.nombreCompleto || null;
};

export default function VentasPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [ventas, setVentas] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState([]);

  const [filters, setFilters] = useState({
    texto: "",
    tipoPago: [],
    inmobiliarias: [],
    fechaVentaMin: null,
    fechaVentaMax: null,
    montoMin: null,
    montoMax: null,
    estados: [],
  });

  const canSaleView = can(user, PERMISSIONS.SALE_VIEW);
  const canSaleEdit = can(user, PERMISSIONS.SALE_UPDATE);
  const canSaleDelete = can(user, PERMISSIONS.SALE_DELETE);

  useEffect(() => {
    let alive = true;

    (async () => {
      setIsLoading(true);
      try {
        const [ventasResp, personasResp, inmosResp] = await Promise.all([
          getAllVentas({}),
          getAllPersonas({}),
          getAllInmobiliarias({}),
        ]);

        // ⬇️ Extrae arrays sin importar el shape
        const ventasApi = pickArray(ventasResp, ["ventas"]);
        const personasApi = pickArray(personasResp, ["personas"]);
        const inmosApi = pickArray(inmosResp, ["inmobiliarias"]);

        // 🔒 Mapas por id normalizados a string (evita "3" vs 3)
        const personasById = {};
        for (const p of personasApi) if (p && p.id != null) personasById[String(p.id)] = p;

        const inmosById = {};
        for (const i of inmosApi) if (i && i.id != null) inmosById[String(i.id)] = i;

        const enriched = ventasApi.map((v) => {
          // — Comprador: embebido si viene; si no, por id
          const buyerId = v?.buyerId ?? v?.compradorId ?? null;
          const comprador =
            v?.comprador ?? (buyerId != null ? personasById[String(buyerId)] || null : null);

          const compradorNombreCompleto = buildFullName(comprador);

          // — Inmobiliaria: embebido si viene; si no, por id; si no existe → La Federala
          const inmoId = v?.inmobiliariaId ?? v?.inmobiliaria_id ?? null;
          let inmobiliaria =
            v?.inmobiliaria ?? (inmoId != null ? inmosById[String(inmoId)] || null : null);
          if (!inmobiliaria) inmobiliaria = { id: null, nombre: "La Federala" };

          // — Alias que ya usás (no romper filtros)
          return {
            ...v,
            comprador,
            compradorNombreCompleto,
            inmobiliaria,
            loteId: v.loteId ?? v.lotId,
            fechaVenta: v.fechaVenta ?? v.date,
            monto: v.monto ?? v.amount,
            estado: v.estado ?? v.status,
            tipoPago: v.tipoPago ?? v.paymentType,
          };
        });

        if (alive) setVentas(enriched);
      } catch (err) {
        console.error("Error cargando ventas/personas/inmobiliarias:", err);
        if (alive) setVentas([]);
      } finally {
        if (alive) setIsLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  const ventasFiltradas = useMemo(() => applyVentaFilters(ventas, filters), [ventas, filters]);

  const onVer = useCallback((venta) => navigate(`/ventas/${venta.id}`), [navigate]);
  const onEditar = useCallback((venta) => navigate(`/ventas/${venta.id}/editar`), [navigate]);
  const onEliminar = useCallback((venta) => navigate(`/ventas/${venta.id}/eliminar`), [navigate]);
  const onVerDocumentos = useCallback(
    (venta) => navigate(`/ventas/${venta.id}/documentos`),
    [navigate]
  );
  const onAgregarVenta = useCallback(() => navigate(`/ventas/nueva`), [navigate]);

  return (
    <>
      <FilterBarVentas
        value={filters}
        onChange={setFilters}
        isLoading={isLoading}
        total={ventas.length}
        filtrados={ventasFiltradas.length}
        onClear={() =>
          setFilters({
            texto: "",
            tipoPago: [],
            inmobiliarias: [],
            fechaVentaMin: null,
            fechaVentaMax: null,
            montoMin: null,
            montoMax: null,
            estados: [],
          })
        }
      />

      <TablaVentas
        rows={ventasFiltradas}
        isLoading={isLoading}
        data={ventas}
        onVer={canSaleView ? onVer : null}
        onEditar={canSaleEdit ? onEditar : null}
        onEliminar={canSaleDelete ? onEliminar : null}
        onVerDocumentos={canSaleView ? onVerDocumentos : null}
        onAgregarVenta={can(user, PERMISSIONS.SALE_CREATE) ? onAgregarVenta : null}
        selectedIds={selectedIds}
        onSelectedChange={setSelectedIds}
      />
    </>
  );
}