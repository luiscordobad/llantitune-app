export default function Home() {
  return (
    <div style={{ maxWidth: 900 }}>
      <h1>Llantitune</h1>
      <p style={{ marginTop: 0, color: "#444" }}>
        Admin + importación de listas + cotizador.
      </p>

      <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
        <a href="/admin/import">→ Importar listas</a>
        <a href="/quote">→ Cotizar</a>
      </div>

      <hr style={{ margin: "24px 0" }} />

      <p style={{ color: "#666" }}>
        Primero sube listas en <b>Importar</b> y luego cotiza en <b>Cotizar</b>.
      </p>
    </div>
  );
}
