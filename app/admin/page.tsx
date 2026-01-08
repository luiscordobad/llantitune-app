import PageHeader from "@/app/components/PageHeader";

export default function AdminHome() {
  return (
    <div>
      <PageHeader
        title="Admin"
        description="Configuración y operaciones internas (importaciones, ajustes, clientes, pedidos)."
      />

      <div className="grid3">
        <a href="/admin/import" className="card cardPadLg" style={{ textDecoration: "none" }}>
          <div className="cardTitle">Importar listas</div>
          <p className="p">Cargar catálogos / snapshots de proveedores.</p>
        </a>

        <a href="/admin/settings" className="card cardPadLg" style={{ textDecoration: "none" }}>
          <div className="cardTitle">Ajustes</div>
          <p className="p">Markup, servicios por vehículo y stock mínimo.</p>
        </a>

        <a href="/admin/customers" className="card cardPadLg" style={{ textDecoration: "none" }}>
          <div className="cardTitle">Clientes</div>
          <p className="p">Búsqueda e historial de cotizaciones / pedidos.</p>
        </a>
      </div>
    </div>
  );
}
