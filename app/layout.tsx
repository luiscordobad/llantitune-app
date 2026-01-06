import "./globals.css";
import Topbar from "@/app/components/Topbar";

export const metadata = { title: "Llantitune" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <Topbar />
        <div className="container">{children}</div>
      </body>
    </html>
  );
}
