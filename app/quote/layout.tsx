import Topbar from "@/app/components/Topbar";

export default function QuoteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ maxWidth: 1150 }}>
      <Topbar />
      {children}
    </div>
  );
}
