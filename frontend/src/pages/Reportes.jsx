// src/pages/Reportes.jsx
// Módulo placeholder. En este paso (19) no hay validación por campo ni llamadas que requieran mapeo de errores.
// Queda listo para el próximo paso cuando conectemos datos reales o export.

import { useState } from "react";
import { Row, Col, Card, Form, Button, Alert } from "react-bootstrap";
import { useToast } from "../app/providers/ToastProvider";

export default function Reportes() {
  const [filters, setFilters] = useState({ entidad: "ventas", desde: "", hasta: "" });
  const toast = useToast();
  const info = toast?.info ?? (() => {});

  const onChange = (e) => setFilters((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  const aplicar  = () => info("Filtros aplicados (placeholder).");
  const exportar = () => info(`Exportando ${filters.entidad} (placeholder).`);

  return (
    <div className="container py-3">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5 className="m-0">Reportes</h5>
        <div className="text-muted small">Módulo en preparación</div>
      </div>

      <Card className="mb-3">
        <Card.Body>
          <Row className="g-3">
            <Col md={4}>
              <Form.Label>Entidad</Form.Label>
              <Form.Select name="entidad" value={filters.entidad} onChange={onChange}>
                <option value="ventas">Ventas</option>
                <option value="reservas">Reservas</option>
                <option value="lotes">Lotes</option>
                <option value="personas">Personas</option>
              </Form.Select>
            </Col>
            <Col md={4}>
              <Form.Label>Desde</Form.Label>
              <Form.Control type="date" name="desde" value={filters.desde} onChange={onChange} />
            </Col>
            <Col md={4}>
              <Form.Label>Hasta</Form.Label>
              <Form.Control type="date" name="hasta" value={filters.hasta} onChange={onChange} />
            </Col>
          </Row>
          <div className="d-flex gap-2 mt-3">
            <Button variant="primary" onClick={aplicar}>Aplicar filtros</Button>
            <Button variant="outline-secondary" onClick={exportar}>Exportar CSV</Button>
          </div>
        </Card.Body>
      </Card>

      <Alert variant="info" className="mb-0">
        Acá vamos a renderizar los resultados (tablas, KPIs o gráficos) usando los filtros de arriba.
      </Alert>
    </div>
  );
}
