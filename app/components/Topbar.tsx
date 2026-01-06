"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

type Role = "admin" | "mechanic" | "unknown";

export default function Topbar() {
  const supabase = supabaseBrowser();
  const pathname = usePathname();

  const [email, setEmail] = useState<string>("");
  const [role, setRole] = useState<Role>("unknown");

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
        const r = (prof?.role ?? "mechanic") as Role;
        setRole(r);
      } else {
        setRole("unknown");
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const tabs = useMemo(() => {
    const base = [
      { href: "/", label: "Dashboard" },
      { href: "/work", label: "Órdenes" },
    ];

    const admin = [
      { href: "/quote", label: "Cotizar" },
      { href: "/admin", label: "Admin" },
    ];

    const isAdmin = role === "admin";
    return isAdmin ? [...base.slice(0, 1), ...admin, ...base.slice(1)] : base;
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
    role === "admin" ? "Admin" : role === "mechanic" ? "Mecánico" : email ? "Usuario" : "Visitante";

  return (
    <div className="navWrap">
      <div className="nav">
        <div className="row" style={{ gap: 12 }}>
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
              {t.label}
            </a>
          ))}

          {!email ? (
            <a className="tab" href="/login">
              Login
            </a>
          ) : (
            <button className="btn btnGhost" type="button" onClick={logout} title={email}>
              Salir
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
