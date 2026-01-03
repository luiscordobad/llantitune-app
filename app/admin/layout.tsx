import Topbar from "@/app/components/Topbar";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ maxWidth: 1100 }}>
      <Topbar />
      {children}
    </div>
  );
}
