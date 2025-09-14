// Módulo de Reportes (placeholder).
// Objetivo: tener la ruta funcionando, con filtros básicos y botones
// para exportar o ver reportes. Más adelante acá conectamos la lógica real.

import { useState } from "react";
import { Row, Col, Card, Form, Button, Alert } from "react-bootstrap";
import { useToast } from "../app/providers/ToastProvider";

export default function Reportes() {
  // Guardo filtros simples para usar más adelante (rango de fechas + entidad)
  const [filters, setFilters] = useState({
    entidad: "ventas", // ventas | reservas | lotes | personas
    desde: "",
    hasta: "",
  });

  // Avisos rápidos (por ahora solo informativos)
  const toast = useToast();
  const info = toast?.info ?? (() => {});
  const success = toast?.success ?? (() => {});

  // Cuando cambie cualquier input actualizo el filtro correspondiente
  const onChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  // “Aplicar filtros” todavía no hace nada. Lo dejamos listo.
  const aplicar = () => {
    info("Filtros aplicados (placeholder). Más adelante conectamos los datos reales.");
  };

  // “Exportar CSV” también lo dejamos preparado
  const exportar = () => {
    info(`Exportando ${filters.entidad} (placeholder).`);
    // Más adelante: llamamos a un endpoint o generamos el CSV en el front.
  };

  return (
    <div className="container py-3">
      {/* Encabezado simple */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5 className="m-0">Reportes</h5>
        <div className="text-muted small">Módulo en preparación</div>
      </div>

      {/* Filtros básicos */}
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

      {/* Zona de resultados “dummy” */}
      <Alert variant="info" className="mb-0">
        Acá vamos a renderizar los resultados (tablas, KPIs o gráficos) usando los filtros de arriba.
      </Alert>
    </div>
  );
}
