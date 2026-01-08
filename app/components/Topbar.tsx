"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

type Role = "admin" | "mechanic" | "staff" | "unknown";

function normalizeRole(v: any): Role {
  const r = String(v ?? "").toLowerCase();
  if (r === "admin") return "admin";
  if (r === "mechanic") return "mechanic";
  if (r === "staff" || r === "administrativo" || r === "office" || r === "backoffice") return "staff";
  return r ? "staff" : "unknown";
}

export default function Topbar() {
  const supabase = supabaseBrowser();
  const pathname = usePathname();

  const [email, setEmail] = useState<string>("");
  const [role, setRole] = useState<Role>("unknown");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let mounted = true;

    (async () => {
      const { data } = await supabase.auth.getUser();
      const u = data.user;
      if (!mounted) return;

      setEmail(u?.email ?? "");

      // Fetch role (works if profiles is readable for the authenticated user)
      if (u?.id) {
        const { data: prof } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", u.id)
          .maybeSingle();

        if (!mounted) return;
        setRole(normalizeRole((prof as any)?.role));
      } else {
        setRole("unknown");
      }
    })();

    return () => {
      mounted = false;
    };
  }, [supabase]);

  useEffect(() => {
    // Close sidebar on route change (mobile)
    setOpen(false);
  }, [pathname]);

  const tabs = useMemo(() => {
    // NOTE: links respect the existing routes; we are not changing business logic.
    const dashboard = { href: "/", label: "Dashboard", meta: "KPIs" };
    const quote = { href: "/quote", label: "Cotizar", meta: "Paso a paso" };
    const workAdmin = { href: "/admin/orders", label: "Órdenes", meta: "Taller" };
    const workMechanic = { href: "/work", label: "Órdenes", meta: "Taller" };
    const customers = { href: "/admin/customers", label: "Clientes", meta: "CRM" };
    const quotes = { href: "/admin/quotes", label: "Cotizaciones", meta: "Buscar" };
    const reports = { href: "/admin/reports", label: "Reportes", meta: "KPIs" };
    const admin = { href: "/admin", label: "Admin", meta: "Catálogos" };

    if (role === "mechanic") return [workMechanic];
    if (role === "admin") return [dashboard, quote, workAdmin, customers, quotes, reports, admin];
    if (role === "staff") return [dashboard, quote, workAdmin, customers, quotes];
    return [dashboard];
  }, [role]);

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname?.startsWith(href);
  }

  async function logout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  const roleLabel =
    role === "admin" ? "Admin" : role === "mechanic" ? "Mecánico" : role === "staff" ? "Administrativo" : email ? "Usuario" : "Visitante";

  return (
    <>
      {/* Mobile header */}
      <div className="mobileTop">
        <div className="mobileTopInner">
          <button className="iconBtn" type="button" onClick={() => setOpen((p) => !p)} aria-label="Abrir menú">
            ☰
          </button>
          <div className="row" style={{ gap: 10 }}>
            <span className="logo" aria-hidden />
            <span style={{ fontWeight: 850, letterSpacing: "-0.02em" }}>Llantitune</span>
          </div>
          {!email ? (
            <a className="btn btnSmall" href="/login">
              Login
            </a>
          ) : (
            <button className="btn btnSmall btnGhost" type="button" onClick={logout} title={email}>
              Salir
            </button>
          )}
        </div>
      </div>

      {/* Sidebar */}
      <aside className={`navWrap ${open ? "open" : ""}`} aria-label="Navegación principal">
        <div className="nav">
          <div className="roleRow">
            <a className="brand" href="/">
              <span className="logo" aria-hidden />
              <span>Llantitune</span>
            </a>

            <span className="badge" title="Rol detectado por profiles.role">
              <span className="badgeDot" />
              {roleLabel}
            </span>
          </div>

          <div className="tabs">
            {tabs.map((t) => (
              <a key={t.href} className={`tab ${isActive(t.href) ? "tabActive" : ""}`} href={t.href}>
                <span>{t.label}</span>
                {t.meta ? <span className="tabMeta">{t.meta}</span> : null}
              </a>
            ))}
          </div>

          <div className="navFooter">
            <div className="small">
              {email ? (
                <>
                  Sesión: <span style={{ fontFamily: "var(--mono)" }}>{email}</span>
                </>
              ) : (
                "No has iniciado sesión"
              )}
            </div>

            {!email ? (
              <a className="btn btnPrimary" href="/login">
                Iniciar sesión
              </a>
            ) : (
              <button className="btn btnGhost" type="button" onClick={logout} title={email}>
                Cerrar sesión
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Backdrop (mobile) */}
      {open ? (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15,23,42,0.35)",
            zIndex: 35,
          }}
          aria-hidden
        />
      ) : null}
    </>
  );
}
