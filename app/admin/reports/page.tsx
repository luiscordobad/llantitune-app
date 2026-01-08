import PageHeader from "@/app/components/PageHeader";

export default function ReportsPage() {
  return (
    <div style={{ display: "grid", gap: 14, maxWidth: 1200 }}>
      <PageHeader
        title="Reportes"
        description="Analytics / KPIs / Export. (Solo lectura)"
        right={<span className="badge">OK</span>}
      />

      <div className="grid3">
        <div className="card cardPadLg">
          <div className="cardTitle">KPIs operativos</div>
          <p className="p">Visualiza tendencias y métricas clave sin editar órdenes.</p>
          <a className="btn" href="/">Abrir dashboard →</a>
        </div>

        <div className="card cardPadLg">
          <div className="cardTitle">Export</div>
          <p className="p">Descarga reportes (CSV) para contabilidad o proveedores.</p>
          <span className="badge">Próximo</span>
        </div>

        <div className="card cardPadLg">
          <div className="cardTitle">Historial</div>
          <p className="p">Para buscar clientes y cotizaciones, usa Clientes (CRM).</p>
          <a className="btn" href="/admin/customers">Ir a clientes →</a>
        </div>
      </div>

      <div className="card cardPadLg">
        <div className="cardTitle">Nota</div>
        <p className="p">
          "Órdenes" es el módulo de operación del taller (asignación, estatus, promesa, anticipo). "Reportes" se usa
          solo para análisis y export.
        </p>
      </div>
    </div>
  );
}
