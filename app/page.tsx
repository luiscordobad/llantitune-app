export default function Home() {
  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div className="card cardPadLg">
        <div className="space">
          <div>
            <h1 className="h1">Dashboard</h1>
            <p className="p">
              Sistema interno para cotizar llantas, administrar listas y operar órdenes de trabajo.
            </p>
          </div>
          <div className="badge" title="Tip: usa el menú superior">
            <span className="badgeDot" />
            Navega con las pestañas
          </div>
        </div>
      </div>

      <div className="grid3">
        <a className="card cardPadLg" href="/quote">
          <h2 className="h2">Cotizar</h2>
          <p className="p">Crea una cotización en 5 pasos (cliente → vehículo → internos → medidas → envío).</p>
          <div style={{ marginTop: 12 }}>
            <span className="btn btnPrimary">Abrir cotizador</span>
          </div>
        </a>

        <a className="card cardPadLg" href="/admin">
          <h2 className="h2">Admin</h2>
          <p className="p">Importa listas, ajusta settings, consulta clientes y órdenes internas.</p>
          <div style={{ marginTop: 12 }}>
            <span className="btn">Ir a admin</span>
          </div>
        </a>

        <a className="card cardPadLg" href="/work">
          <h2 className="h2">Órdenes de trabajo</h2>
          <p className="p">Vista para mecánicos: ver pedidos y marcar avance en el taller.</p>
          <div style={{ marginTop: 12 }}>
            <span className="btn">Ver órdenes</span>
          </div>
        </a>
      </div>

      <div className="card cardPadLg">
        <h2 className="h2">Flujo recomendado</h2>
        <hr className="hr" />
        <div className="grid2">
          <div>
            <div className="badge"><span className="badgeDot" /> Admin</div>
            <p className="p">
              1) Importa listas de proveedores → 2) Ajusta settings internos (markup/stock) → 3) Gestiona clientes.
            </p>
          </div>
          <div>
            <div className="badge"><span className="badgeDot" /> Operación</div>
            <p className="p">
              4) Cotiza y envía → 5) Crea pedido interno → 6) Mecánicos ejecutan en Órdenes de trabajo.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
