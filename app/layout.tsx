
import "./globals.css"
import { ModalProvider } from "./providers/ModalProvider"

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <ModalProvider>
          {children}
          <div id="modal-root" />
        </ModalProvider>
      </body>
    </html>
  )
}
