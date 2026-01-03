export default function Home() {
  return (
    <div style={{ maxWidth: 900 }}>
      <h1>Llantitune</h1>
      <p style={{ marginTop: 0, color: "#444" }}>
        Admin + importación de listas + cotizador.
      </p>

      <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
        <a href="/admin">→ Admin</a>
        <a href="/quote">→ Cotizar</a>
      </div>

      <hr style={{ margin: "24px 0" }} />
      <p style={{ color: "#666" }}>
        Flujo: 1) Importa listas 2) Cotiza 3) Elige opción final 4) Genera pedido interno.
      </p>
    </div>
  );
}
