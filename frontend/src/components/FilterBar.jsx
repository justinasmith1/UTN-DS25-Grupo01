// src/components/FilterBar.jsx
"use client" //Activa el modo cliente para hooks y eventos
import { Container, Row, Col, Button, FormControl, InputGroup, Dropdown, Badge } from "react-bootstrap"

const customStyles = `
  .brand-pale-green { 
    background-color: #e6efe9 !important; 
  }
  .brand-dark-green { 
    background-color: #0b3d23 !important; 
    border-color: #0b3d23 !important; 
    color: white !important;
  }
  .brand-dark-green:hover { 
    background-color: rgba(11, 61, 35, 0.8) !important; 
  }
  .border-brand-dark-green { 
    border-color: #0b3d23 !important; 
  }
  .text-brand-dark-green { 
    color: #0b3d23 !important; 
  }
  .filter-btn {
    border-radius: 12px !important;
    transition: all 0.15s ease;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }
  .filter-btn:hover {
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.15);
  }
  .filter-input {
    border-radius: 12px !important;
    border-color: #d1d5db;
    transition: all 0.15s ease;
  }
  .filter-input:focus {
    border-color: #0b3d23 !important;
    box-shadow: 0 0 0 0.2rem rgba(11, 61, 35, 0.25) !important;
  }
`

export default function FilterBar({ filters, onFiltersChange, onAddRecord, onApplyPromotion, onClearFilters }) {
  // Opciones disponibles para cada categoria de filtro, en un futuro se tienen que ir a buscar a la BD
  const filterOptions = {
    owner: ["CCLF", "Juan Pérez", "Ana Gómez", "Carlos López"],
    location: ["Sector Norte", "Sector Sur", "Sector Este", "Sector Oeste"],
    status: ["Disponible", "Vendido", "No Disponible","Reservado", "Alquilado"],
    subStatus: ["En Construccion", "Construido", "No Construido"],
  }

  //Alterna un valor dentro de la categoria: lo agrega o lo quita
  const toggleFilter = (category, value) => {
    if (category === "search") return

    const currentValues = filters[category] || []
    const newValues = currentValues.includes(value)
      ? currentValues.filter((v) => v !== value)
      : [...currentValues, value]

    onFiltersChange({
      ...filters,
      [category]: newValues,
    })
  }

  // Comprueba si existe al menos un filtro activo
  const hasActiveFilters =
    filters.search ||
    (filters.owner && filters.owner.length > 0) ||
    (filters.location && filters.location.length > 0) ||
    (filters.status && filters.status.length > 0) ||
    (filters.subStatus && filters.subStatus.length > 0)

  return (
    <>
      <style>{customStyles}</style>
      <div className="brand-pale-green py-3">
        <Container>
          <Row className="align-items-center mb-3">
            <Col md={1}>
              <Button
                variant="outline-success"
                className="filter-btn border-brand-dark-green text-brand-dark-green"
                onClick={onAddRecord}
              >
                <i className="bi bi-plus" style={{ fontSize: "1.2rem" }}></i>
              </Button>
            </Col>
            <Col md={6}>
              <InputGroup>
                <span className="input-group-text bg-white border-end-0" style={{ borderRight: "none" }}>
                  <i className="bi bi-search text-muted"></i>
                </span>
                <input
                  type="text"
                  className="form-control border-start-0"
                  style={{
                    borderLeft: "none",
                    boxShadow: "none",
                    borderTopRightRadius: "8px",
                    borderBottomRightRadius: "8px",
                    borderTopLeftRadius: "0",
                    borderBottomLeftRadius: "0"
                  }}
                  placeholder="ID de Lote..."
                  value={filters.search || ""}
                  onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
                />
              </InputGroup>

              
            </Col>
            <Col md={3}>
              <Button className="brand-dark-green filter-btn" onClick={onApplyPromotion}>
                Aplicar promoción
              </Button>
            </Col>
            <Col md={2}>
              {hasActiveFilters && (
                <Button variant="outline-secondary" className="filter-btn" onClick={onClearFilters}>
                  Limpiar filtros
                </Button>
              )}
            </Col>
          </Row>

          <Row>
            <Col>
              <div className="d-flex gap-2 flex-wrap">
                {Object.entries(filterOptions).map(([category, options]) => {
                  const filterCount = (filters[category] || []).length
                  const isActive = filterCount > 0

                  return (
                    <Dropdown key={category}>
                      <Dropdown.Toggle
                        variant={isActive ? "success" : "outline-secondary"}
                        size="sm"
                        className={`filter-btn ${isActive ? "border-brand-dark-green" : ""}`}
                      >
                        {category === "subStatus"
                          ? "Sub-Estado"
                          : category === "owner"
                            ? "Propietario"
                            : category === "location"
                              ? "Ubicación"
                              : category === "status"
                                ? "Estado"
                                : category}
                        {filterCount > 0 && (
                          <Badge bg="light" text="dark" className="ms-1">
                            {filterCount}
                          </Badge>
                        )}
                      </Dropdown.Toggle>
                      <Dropdown.Menu style={{ borderRadius: "12px", boxShadow: "0 4px 6px rgba(0, 0, 0, 0.15)" }}>
                        {options.map((option) => (
                          <Dropdown.Item
                            key={option}
                            onClick={() => toggleFilter(category, option)}
                            className={`${
                              (filters[category] || []).includes(option) ? "active bg-success text-white" : ""
                            }`}
                            style={{ transition: "all 0.15s ease" }}
                          >
                            {option}
                          </Dropdown.Item>
                        ))}
                      </Dropdown.Menu>
                    </Dropdown>
                  )
                })}
              </div>
            </Col>
          </Row>
        </Container>
      </div>
    </>
  )
}
