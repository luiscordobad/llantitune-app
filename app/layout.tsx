import "./globals.css";
import Topbar from "@/app/components/Topbar";

export const metadata = { title: "Llantitune" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <div className="appShell">
          <Topbar />
          <main className="appMain">
            <div className="container">{children}</div>
          </main>
        </div>
      </body>
    </html>
  );
}
