// src/pages/Ventas.jsx
// Objetivo: cargar ventas + personas, enriquecer ventas con `comprador`
// y renderizar la tabla con filtros. Solución estable y directa.

import { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../app/providers/AuthProvider";
import { can, PERMISSIONS } from "../lib/auth/rbac";

// API: ajustá estos imports si tus paths/nombres difieren
import { getAllVentas } from "../lib/api/ventas";
import { getAllPersonas } from "../lib/api/personas";

import { applyVentaFilters } from "../utils/applyVentaFilters";
import TablaVentas from "../components/Table/TablaVentas/TablaVentas";
import FilterBarVentas from "../components/FilterBar/FilterBarVentas";

/* -------------------------------------------------------------
   Helper: normaliza cualquier respuesta a Array.
   (Muchas APIs devuelven {data:[...]}; otras directamente [...])
-------------------------------------------------------------- */
function toArray(resp) {
  if (!resp) return [];
  if (Array.isArray(resp)) return resp;
  if (Array.isArray(resp?.data)) return resp.data;
  if (Array.isArray(resp?.lista)) return resp.lista;
  if (Array.isArray(resp?.items)) return resp.items;
  if (Array.isArray(resp?.results)) return resp.results;
  if (resp?.data && typeof resp.data === "object") {
    const d = resp.data;
    if (Array.isArray(d?.lista)) return d.lista;
    if (Array.isArray(d?.items)) return d.items;
    if (Array.isArray(d?.results)) return d.results;
  }
  return [];
}

export default function Ventas() {
  const { user } = useAuth();
  const userRole = (user?.role ?? user?.rol ?? "ADMIN")
    .toString()
    .trim()
    .toUpperCase();

  const navigate = useNavigate();

  // Filtros provenientes de la FilterBar
  const [params, setParams] = useState({});
  const handleParamsChange = useCallback((patch) => {
    if (!patch || Object.keys(patch).length === 0) {
      setParams({});
      return;
    }
    setParams((prev) => ({ ...prev, ...patch }));
  }, []);

  // Dataset base y estados de UI
  const [allVentas, setAllVentas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState([]);

  /* -------------------------------------------------------------
     Carga paralela: Ventas + Personas, y join en front.
     Por qué: hoy el back de ventas entrega buyerId (no comprador).
     Estrategia:
       1) Traigo todas las ventas.
       2) Traigo todas las personas (única llamada).
       3) Armo personasById.
       4) Enriquezco cada venta:
            - Si YA viene v.comprador del back → se respeta.
            - Si no viene, lo resuelvo desde personasById[buyerId|compradorId].
       5) También normalizo alias usados por la tabla (sin destruir originales).
  -------------------------------------------------------------- */
  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);

        // 1) Llamadas en paralelo
        const [ventasResp, personasResp] = await Promise.all([
          getAllVentas({}),
          getAllPersonas({}),
        ]);

        // 2) Normalización a arrays
        const ventasApi = toArray(ventasResp);
        const personasApi = toArray(personasResp);

        // 3) Mapa por id para lookup O(1)
        const personasById = {};
        for (const p of personasApi) {
          if (p && p.id != null) personasById[p.id] = p;
        }

        // 4) Enriquecimiento + alias no destructivos
        const enriched = ventasApi.map((v) => {
          // si el back ya mandó comprador, lo respetamos; si no, buscamos por id
          const buyerId = v?.buyerId ?? v?.compradorId ?? null;
          const comprador =
            v?.comprador ??
            (buyerId != null ? personasById[buyerId] || null : null);

          return {
            ...v, // preservamos todo lo que venga del back
            comprador, // lo que necesita la columna "Comprador"
            // alias que usa la tabla (dejamos los originales también)
            loteId: v.loteId ?? v.lotId,
            fechaVenta: v.fechaVenta ?? v.date,
            monto: v.monto ?? v.amount,
            estado: v.estado ?? v.status,
            tipoPago: v.tipoPago ?? v.paymentType,
            // inmobiliaria queda para más adelante cuando el back envíe el objeto
          };
        });

        if (alive) setAllVentas(enriched);
      } catch (err) {
        console.error("[Ventas] Error cargando datos:", err);
        if (alive) setAllVentas([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  // Aplicación de filtros en cliente
  const ventas = useMemo(() => {
    const hasParams = params && Object.keys(params).length > 0;
    try {
      return hasParams ? applyVentaFilters(allVentas, params) : allVentas;
    } catch (err) {
      console.error("[Ventas] Error aplicando filtros:", err);
      return allVentas;
    }
  }, [allVentas, params]);

  // Permisos (acciones de fila)
  const canSaleView = can(user, PERMISSIONS.SALE_VIEW);
  const canSaleEdit = can(user, PERMISSIONS.SALE_EDIT);
  const canSaleDelete = can(user, PERMISSIONS.SALE_DELETE);

  const onVer = (venta) => navigate(`/ventas/${venta.id}`);
  const onEditar = (venta) => navigate(`/ventas/${venta.id}/editar`);
  const onEliminar = (venta) => {
    if (window.confirm(`¿Eliminar la venta ${venta.id}?`)) {
      console.log("Eliminar venta:", venta.id);
    }
  };
  const onVerDocumentos = (venta) => navigate(`/ventas/${venta.id}/documentos`);
  const onAgregarVenta = () => navigate("/ventas/nueva");

  if (loading) {
    return (
      <div
        className="d-flex justify-content-center align-items-center"
        style={{ minHeight: "40vh" }}
      >
        <div className="spinner-border" role="status" />
        <span className="ms-2">Cargando ventas…</span>
      </div>
    );
  }

  return (
    <>
      {/* Barra de Filtros del módulo Ventas */}
      <FilterBarVentas
        variant="dashboard"
        userRole={userRole}
        onParamsChange={handleParamsChange}
      />

      <TablaVentas
        userRole={userRole}
        ventas={ventas}
        data={ventas}
        onVer={canSaleView ? onVer : null}
        onEditar={canSaleEdit ? onEditar : null}
        onEliminar={canSaleDelete ? onEliminar : null}
        onVerDocumentos={canSaleView ? onVerDocumentos : null}
        onAgregarVenta={
          can(user, PERMISSIONS.SALE_CREATE) ? onAgregarVenta : null
        }
        selectedIds={selectedIds}
        onSelectedChange={setSelectedIds}
      />
    </>
  );
}
