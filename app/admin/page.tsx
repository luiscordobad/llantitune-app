export default function AdminHome() {
  return (
    <div style={{ maxWidth: 900 }}>
      <h2>Admin</h2>
      <ul>
        <li><a href="/admin/import">Importar listas</a></li>
        <li><a href="/admin/settings">Ajustes (markup / servicios / stock mínimo)</a></li>
        <li><a href="/admin/customers">Clientes + historial</a></li>
      </ul>
    </div>
  );
}
