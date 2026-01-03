import Topbar from "@/app/components/Topbar";

export default function WorkLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ maxWidth: 1100 }}>
      <Topbar />
      {children}
    </div>
  );
}
