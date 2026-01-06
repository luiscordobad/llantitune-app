"use client";

import { useEffect, useMemo, useState } from "react";

type DashboardData = {
  ok: boolean;
  error?: string;
  totals?: { quotes30d: number; orders30d: number; activeOrders: number };
  quotesPerDay14d?: { day: string; count: number }[];
  weekdayCounts?: Record<string, number>;
  topSizes?: { size: string; count: number }[];
  topBrands?: { brand: string; count: number }[];
  warnings?: Record<string, string | null>;
};

function maxOf(arr: number[]) {
  return arr.reduce((m, v) => (v > m ? v : m), 0);
}

export default function Home() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [status, setStatus] = useState("Cargando KPIs…");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/dashboard", { cache: "no-store" });
        const d = (await res.json()) as DashboardData;
        if (!res.ok || !d.ok) {
          setStatus("No se pudo cargar KPIs");
          setData(d);
          return;
        }
        setData(d);
        setStatus("OK");
      } catch (e: any) {
        setStatus("Error");
        setData({ ok: false, error: e?.message ?? "unknown" });
      }
    })();
  }, []);

  const bars = useMemo(() => {
    const arr = data?.quotesPerDay14d ?? [];
    const m = maxOf(arr.map((x) => x.count));
    return arr.map((x) => ({ ...x, pct: m ? Math.round((x.count / m) * 100) : 0 }));
  }, [data]);

  const weekdayBars = useMemo(() => {
    const wc = data?.weekdayCounts ?? {};
    const keys = Object.keys(wc);
    const m = maxOf(keys.map((k) => wc[k] ?? 0));
    return keys.map((k) => ({ k, v: wc[k] ?? 0, pct: m ? Math.round(((wc[k] ?? 0) / m) * 100) : 0 }));
  }, [data]);

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div className="card cardPadLg">
        <div className="space">
          <div>
            <h1 className="h1">Dashboard</h1>
            <p className="p">KPIs operativos (últimos 30 días) para dueños, administración y taller.</p>
          </div>
          <span className="badge" title="Datos agregados desde Supabase">
            <span className="badgeDot" />
            {status}
          </span>
        </div>

        {data?.ok ? (
          <>
            <hr className="hr" />

            <div className="grid3">
              <div className="card cardPad">
                <div className="kpi">
                  <div className="kpiValue">{data.totals?.quotes30d ?? 0}</div>
                  <div className="kpiLabel">Cotizaciones (30d)</div>
                </div>
              </div>

              <div className="card cardPad">
                <div className="kpi">
                  <div className="kpiValue">{data.totals?.orders30d ?? 0}</div>
                  <div className="kpiLabel">Órdenes creadas (30d)</div>
                </div>
              </div>

              <div className="card cardPad">
                <div className="kpi">
                  <div className="kpiValue">{data.totals?.activeOrders ?? 0}</div>
                  <div className="kpiLabel">Órdenes activas</div>
                </div>
              </div>
            </div>

            <div className="grid2" style={{ marginTop: 14 }}>
              <div className="card cardPad">
                <div className="cardHeader">
                  <div className="cardTitle">Cotizaciones por día (14d)</div>
                  <div className="small">Tendencia reciente</div>
                </div>
                <hr className="hr" />
                <div style={{ display: "grid", gap: 8 }}>
                  {bars.map((b) => (
                    <div key={b.day} style={{ display: "grid", gridTemplateColumns: "92px 1fr 40px", gap: 10, alignItems: "center" }}>
                      <div className="small" style={{ fontFamily: "var(--mono)" }}>
                        {b.day.slice(5)}
                      </div>
                      <div style={{ height: 10, background: "rgba(15,23,42,0.06)", borderRadius: 999, overflow: "hidden", border: "1px solid rgba(15,23,42,0.10)" }}>
                        <div style={{ width: `${b.pct}%`, height: "100%", background: "linear-gradient(90deg, rgba(31,95,191,0.8), rgba(43,123,216,0.8))" }} />
                      </div>
                      <div className="small" style={{ textAlign: "right" }}>
                        {b.count}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card cardPad">
                <div className="cardHeader">
                  <div className="cardTitle">Días más activos</div>
                  <div className="small">Distribución semanal</div>
                </div>
                <hr className="hr" />
                <div style={{ display: "grid", gap: 8 }}>
                  {weekdayBars.map((b) => (
                    <div key={b.k} style={{ display: "grid", gridTemplateColumns: "44px 1fr 40px", gap: 10, alignItems: "center" }}>
                      <div className="small" style={{ fontFamily: "var(--mono)" }}>
                        {b.k}
                      </div>
                      <div style={{ height: 10, background: "rgba(15,23,42,0.06)", borderRadius: 999, overflow: "hidden", border: "1px solid rgba(15,23,42,0.10)" }}>
                        <div style={{ width: `${b.pct}%`, height: "100%", background: "linear-gradient(90deg, rgba(31,95,191,0.8), rgba(43,123,216,0.8))" }} />
                      </div>
                      <div className="small" style={{ textAlign: "right" }}>
                        {b.v}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid2" style={{ marginTop: 14 }}>
              <div className="card cardPad">
                <div className="cardHeader">
                  <div className="cardTitle">Medidas más cotizadas</div>
                  <div className="small">Top 8</div>
                </div>
                <hr className="hr" />
                {data.topSizes?.length ? (
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Medida</th>
                        <th style={{ textAlign: "right" }}>#</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.topSizes.map((x) => (
                        <tr key={x.size}>
                          <td style={{ fontFamily: "var(--mono)" }}>{x.size}</td>
                          <td style={{ textAlign: "right" }}>{x.count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="small">Aún no hay datos suficientes.</div>
                )}
              </div>

              <div className="card cardPad">
                <div className="cardHeader">
                  <div className="cardTitle">Marcas más enviadas</div>
                  <div className="small">Top 8</div>
                </div>
                <hr className="hr" />
                {data.topBrands?.length ? (
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Marca</th>
                        <th style={{ textAlign: "right" }}>#</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.topBrands.map((x) => (
                        <tr key={x.brand}>
                          <td>{x.brand}</td>
                          <td style={{ textAlign: "right" }}>{x.count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="small">Aún no hay datos suficientes.</div>
                )}
              </div>
            </div>

            {data.warnings && (data.warnings.quote_items || data.warnings.quote_lines || data.warnings.orders) ? (
              <div className="stepCard" style={{ marginTop: 14 }}>
                <b>Nota</b>
                <div className="small" style={{ marginTop: 6 }}>
                  {data.warnings.quote_lines ? <div>• {data.warnings.quote_lines}</div> : null}
                  {data.warnings.quote_items ? <div>• {data.warnings.quote_items}</div> : null}
                  {data.warnings.orders ? <div>• {data.warnings.orders}</div> : null}
                </div>
              </div>
            ) : null}
          </>
        ) : (
          <div className="stepCard" style={{ marginTop: 14 }}>
            <b>No se pudieron cargar KPIs.</b>
            <div className="small" style={{ marginTop: 6 }}>
              {data?.error ? data.error : "Revisa conexión / permisos de tablas en Supabase."}
            </div>
          </div>
        )}
      </div>

      <div className="grid2">
        <a className="card cardPadLg" href="/quote" style={{ display: "block" }}>
          <div className="cardHeader">
            <div className="cardTitle">Cotizar llantas</div>
            <span className="badge">
              <span className="badgeDot" />
              Paso a paso
            </span>
          </div>
          <p className="p">Captura cliente → vehículo → medidas → selecciona opciones → previsualiza y envía.</p>
          <div style={{ marginTop: 12 }}>
            <span className="btn btnPrimary">Iniciar cotización</span>
          </div>
        </a>

        <a className="card cardPadLg" href="/work" style={{ display: "block" }}>
          <div className="cardHeader">
            <div className="cardTitle">Órdenes de trabajo</div>
            <span className="badge">
              <span className="badgeDot" />
              Taller
            </span>
          </div>
          <p className="p">Vista para mecánicos: ver órdenes y marcar avance en el taller.</p>
          <div style={{ marginTop: 12 }}>
            <span className="btn">Ver órdenes</span>
          </div>
        </a>
      </div>
    </div>
  );
}
