export default function Home() {
  return (
    <div style={{ maxWidth: 900 }}>
      <h1>Llantitune</h1>
      <p style={{ marginTop: 0, color: "#444" }}>
        Sistema interno (login).
      </p>

      <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
        <a href="/login">→ Login</a>
        <a href="/admin">→ Admin</a>
        <a href="/quote">→ Cotizar</a>
        <a href="/work">→ Órdenes de trabajo</a>
      </div>

      <hr style={{ margin: "24px 0" }} />
      <p style={{ color: "#666" }}>
        Flujo: 1) Importa listas (Admin) 2) Cotiza (Admin) 3) Elige opción 4) Pedido interno 5) Órdenes de trabajo (Mecánicos).
      </p>
    </div>
  );
}
