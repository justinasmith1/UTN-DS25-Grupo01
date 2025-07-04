// src/components/Botones.jsx
import { Container, Row, Col, Button } from "react-bootstrap"

const customStyles = `
  .brand-dark-green { 
    background-color: #0b3d23 !important; 
    border-color: #0b3d23 !important; 
    color: white !important;
  }
  .brand-dark-green:hover { 
    background-color: rgba(11, 61, 35, 0.8) !important; 
    border-color: rgba(11, 61, 35, 0.8) !important; 
  }
  .category-btn {
    border-radius: 12px !important;
    font-size: 0.875rem;
    font-weight: 500;
    padding: 0.5rem 1.5rem;
    transition: all 0.15s ease;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }
  .category-btn:hover {
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.15);
    transform: translateY(-1px);
  }
`

export default function Botones() {
  // Lista de las categorias que se van a mostrar como botones
  const categories = ["Ventas", "Inmobiliarias", "Personas", "Reportes"]

  return (
    <>
      <style>{customStyles}</style>
      <div className="bg-white border-bottom py-3">
        <Container>
          <Row>
            <Col>
              <div className="d-flex gap-3 flex-wrap">
                {categories.map((category) => (
                  <Button key={category} className="brand-dark-green category-btn">
                    {category}
                  </Button>
                ))}
              </div>
            </Col>
          </Row>
        </Container>
      </div>
    </>
  )
}
