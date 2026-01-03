"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

export default function LoginPage() {
  const supabase = supabaseBrowser();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");

  async function signIn() {
    setStatus("Entrando...");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return setStatus("Error: " + error.message);

    const next = new URLSearchParams(window.location.search).get("next") || "/admin";
    window.location.href = next;
  }

  return (
    <div style={{ maxWidth: 520 }}>
      <h2>Login</h2>
      <p style={{ color: "#666" }}>Acceso para Admin y Mecánicos.</p>

      <div style={{ display: "grid", gap: 10 }}>
        <label>Email
          <input value={email} onChange={e => setEmail(e.target.value)} />
        </label>
        <label>Password
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} />
        </label>
        <button onClick={signIn}>Entrar</button>
      </div>

      <div style={{ marginTop: 10, color: "#555" }}>{status}</div>

      <hr style={{ margin: "18px 0" }} />
      <p style={{ color: "#666" }}>
        * Los usuarios se crean desde Supabase Auth. Luego se asigna rol en la tabla <b>profiles</b>.
      </p>
    </div>
  );
}
