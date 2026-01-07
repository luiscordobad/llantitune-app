
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="admin-shell">
      <aside className="sidebar">Admin</aside>
      <main>{children}</main>
    </div>
  )
}
