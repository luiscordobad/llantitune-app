"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

export default function LoginPage() {
  const supabase = supabaseBrowser();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) window.location.href = "/";
    });
  }, []);

  async function signIn() {
    setStatus("Entrando...");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return setStatus("Error: " + error.message);
    setStatus("✅ Listo. Redirigiendo...");
    window.location.href = "/";
  }

  return (
    <div style={{ maxWidth: 520, margin: "26px auto 0" }}>
      <div className="card cardPadLg">
        <div className="space" style={{ alignItems: "flex-start" }}>
          <div>
            <h1 className="h1" style={{ fontSize: 22 }}>Login</h1>
            <p className="p">Acceso para Admin y Mecánicos.</p>
          </div>
          <span className="badge">
            <span className="badgeDot" />
            Supabase Auth
          </span>
        </div>

        <hr className="hr" />

        <div className="field">
          <span className="label">Email</span>
          <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@email.com" />
        </div>

        <div className="field" style={{ marginTop: 12 }}>
          <span className="label">Password</span>
          <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
        </div>

        <div className="row" style={{ marginTop: 14, justifyContent: "flex-end" }}>
          <button className="btn btnPrimary" onClick={signIn} type="button" disabled={!email || !password}>
            Entrar
          </button>
        </div>

        {status ? (
          <div style={{ marginTop: 10 }} className="small">
            {status}
          </div>
        ) : null}

        <hr className="hr" />
        <p className="p" style={{ margin: 0 }}>
          * Los usuarios se crean en Supabase Auth. El rol se asigna en la tabla <b>profiles</b> (campo <b>role</b>).
        </p>
      </div>
    </div>
  );
}
