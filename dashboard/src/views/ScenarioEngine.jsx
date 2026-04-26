import { useEffect, useMemo, useState } from "react";

const API = import.meta.env.VITE_API_BASE_URL || "";
const TRANSPORT_FACTORS = { AIR: 0.5474, OCEAN: 0.0233, TRUCK: 0.092, RAIL: 0.0077 };
const TRANSPORT_LABELS = { AIR: "Air freight", OCEAN: "Ocean freight", TRUCK: "Truck", RAIL: "Rail" };

export default function ScenarioEngine() {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scenarios, setScenarios] = useState([]);
  const [targetReduction, setTargetReduction] = useState(30);
  const [pathway, setPathway] = useState(null);
  const [totalBaseline, setTotalBaseline] = useState(0);

  const COUNTRY_DEFAULTS = {
    CN: { weight_kg: 5000, distance_km: 12000 },
    VN: { weight_kg: 3000, distance_km: 11000 },
    MX: { weight_kg: 8000, distance_km: 2500 },
    CA: { weight_kg: 6000, distance_km: 3000 },
    DE: { weight_kg: 4000, distance_km: 9000 },
    IN: { weight_kg: 4000, distance_km: 13000 },
    JP: { weight_kg: 3000, distance_km: 11000 },
    KR: { weight_kg: 3000, distance_km: 11500 },
    TW: { weight_kg: 2000, distance_km: 12000 },
    US: { weight_kg: 5000, distance_km: 1500 },
  };

  useEffect(() => {
    fetch(`${API}/api/v1/suppliers?limit=500`)
      .then((r) => r.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : data.suppliers || [];
        list.sort((a, b) =>
          (a.name || a.supplier_id).localeCompare(b.name || b.supplier_id),
        );
        setSuppliers(list);
        const total = list.reduce((s, x) => s + (x.emissions_30d_kg || 0), 0);
        setTotalBaseline(total);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const addScenario = () =>
    setScenarios((prev) => [
      ...prev,
      { id: Date.now(), supplier_id: "", current_mode: "AIR", new_mode: "OCEAN", weight_kg: 1000, distance_km: 10000 },
    ]);
  const updateScenario = (id, field, value) => {
    setScenarios((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        const updated = { ...s, [field]: value };
        if (field === "supplier_id") {
          const sup = suppliers.find((x) => x.supplier_id === value);
          if (sup) {
            const defaults = COUNTRY_DEFAULTS[sup.country] || {
              weight_kg: 5000,
              distance_km: 8000,
            };
            updated.weight_kg = defaults.weight_kg;
            updated.distance_km = defaults.distance_km;
          }
        }
        return updated;
      }),
    );
  };
  const removeScenario = (id) => setScenarios((prev) => prev.filter((s) => s.id !== id));

  const calcSavings = (s) => {
    const w = parseFloat(s.weight_kg) || 0;
    const d = parseFloat(s.distance_km) || 0;
    const tonnes = w / 1000;
    const current = tonnes * d * (TRANSPORT_FACTORS[s.current_mode] || 0);
    const proposed = tonnes * d * (TRANSPORT_FACTORS[s.new_mode] || 0);
    return {
      current_kg: current,
      proposed_kg: proposed,
      savings_kg: current - proposed,
      savings_pct: current > 0 ? ((current - proposed) / current) * 100 : 0,
    };
  };

  const totalSavings = useMemo(
    () => scenarios.reduce((sum, s) => sum + calcSavings(s).savings_kg, 0),
    [scenarios]
  );
  const targetSavingsKg = (totalBaseline * targetReduction) / 100;
  const targetMet = totalSavings >= targetSavingsKg;

  const loadPathway = async () => {
    const res = await fetch(`${API}/api/v1/emissions/decarbonization-pathway?target_reduction_pct=${targetReduction}`);
    const data = await res.json();
    setPathway(data);
  };

  if (loading)
    return (
      <div style={{ padding: "40px", color: "var(--text-tertiary)", fontSize: "13px" }}>
        Loading...
      </div>
    );

  return (
    <div style={{ padding: "32px 40px", width: "100%" }}>
      <div style={{ marginBottom: "32px" }}>
        <h1 style={{ fontSize: "24px", fontWeight: "700", color: "var(--text-primary)", fontFamily: "var(--font-display)", margin: 0 }}>
          Scenario Engine
        </h1>
        <p style={{ fontSize: "14px", color: "var(--text-secondary)", marginTop: "6px" }}>
          Model supplier switching decisions before you make them.
        </p>
      </div>

      <div className="panel" style={{ padding: "20px 24px", marginBottom: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
          <span style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-primary)" }}>Reduction target</span>
          <span style={{ fontSize: "20px", fontWeight: "700", color: targetMet ? "var(--green-600)" : "var(--text-primary)" }}>{targetReduction}%</span>
        </div>
        <input type="range" min="5" max="80" step="5" value={targetReduction} onChange={(e) => setTargetReduction(Number(e.target.value))} style={{ width: "100%" }} />
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "8px", fontSize: "12px", color: "var(--text-tertiary)" }}>
          <span>Target: {targetSavingsKg.toLocaleString(undefined, { maximumFractionDigits: 0 })} kg CO₂e savings</span>
          <span style={{ color: targetMet ? "var(--green-600)" : "var(--risk-high)" }}>
            {targetMet
              ? `✓ Target met (+${(totalSavings - targetSavingsKg).toLocaleString(undefined, { maximumFractionDigits: 0 })} kg)`
              : `${(targetSavingsKg - totalSavings).toLocaleString(undefined, { maximumFractionDigits: 0 })} kg more needed`}
          </span>
        </div>
      </div>

      {scenarios.map((s) => {
        const calc = calcSavings(s);
        const saving = calc.savings_kg > 0;
        return (
          <div key={s.id} className="panel" style={{ padding: "20px", marginBottom: 12, borderLeft: `3px solid ${saving ? "var(--green-500)" : "var(--risk-high)"}` }}>
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr auto", gap: "12px", alignItems: "end" }}>
              <div>
                <label style={label}>Supplier</label>
                <select
                  value={s.supplier_id}
                  onChange={(e) => updateScenario(s.id, "supplier_id", e.target.value)}
                  style={{
                    width: "100%",
                    padding: "7px 10px",
                    border: "1px solid var(--border-default)",
                    borderRadius: "var(--radius-md)",
                    background: "var(--bg-subtle)",
                    color: "var(--text-primary)",
                    fontSize: "12px",
                    cursor: "pointer",
                  }}
                >
                  <option value="">Select supplier...</option>
                  {suppliers.map((sup) => (
                    <option key={sup.supplier_id} value={sup.supplier_id}>
                      {sup.name || sup.supplier_id} ({sup.country})
                    </option>
                  ))}
                </select>
              </div>
              {["current_mode", "new_mode"].map((field) => (
                <div key={field}>
                  <label style={label}>{field === "current_mode" ? "From" : "To"}</label>
                  <select value={s[field]} onChange={(e) => updateScenario(s.id, field, e.target.value)} style={inputStyle}>
                    {Object.entries(TRANSPORT_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
              {[
                ["weight_kg", "Weight (kg)"],
                ["distance_km", "Distance (km)"],
              ].map(([field, text]) => (
                <div key={field}>
                  <label style={label}>{text}</label>
                  <input type="number" value={s[field]} onChange={(e) => updateScenario(s.id, field, e.target.value)} style={inputStyle} />
                </div>
              ))}
              <button onClick={() => removeScenario(s.id)} style={{ ...inputStyle, cursor: "pointer" }}>
                ✕
              </button>
            </div>
            <div style={{ display: "flex", gap: "24px", marginTop: "14px", paddingTop: "12px", borderTop: "1px solid var(--border-subtle)", fontSize: "12px" }}>
              <span style={{ color: "var(--text-tertiary)" }}>
                Current: <strong style={{ color: "var(--text-primary)" }}>{calc.current_kg.toFixed(1)} kg CO₂e</strong>
              </span>
              <span style={{ color: "var(--text-tertiary)" }}>
                Proposed: <strong style={{ color: "var(--text-primary)" }}>{calc.proposed_kg.toFixed(1)} kg CO₂e</strong>
              </span>
              <span style={{ color: saving ? "var(--green-600)" : "var(--risk-high)", fontWeight: "600" }}>
                {saving ? "↓" : "↑"} {Math.abs(calc.savings_kg).toFixed(1)} kg ({Math.abs(calc.savings_pct).toFixed(1)}%{saving ? " saved" : " increase"})
              </span>
            </div>
          </div>
        );
      })}

      <button onClick={addScenario} style={{ marginTop: 8, padding: "10px 20px", border: "1.5px dashed var(--border-strong)", borderRadius: "var(--radius-md)", width: "100%", background: "var(--bg-surface)", cursor: "pointer" }}>
        + Add scenario
      </button>
      <button onClick={loadPathway} style={{ marginTop: 12, padding: "10px 20px", border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)", width: "100%", background: "var(--green-500)", color: "#fff", cursor: "pointer" }}>
        Pathway
      </button>

      {pathway ? (
        <div className="panel" style={{ marginTop: 16, padding: 16 }}>
          <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginBottom: 8 }}>
            Actions required: {pathway.actions_required} · Achievable: {String(pathway.achievable)}
          </div>
          {(pathway.pathway || []).map((p) => (
            <div key={p.rank} style={{ padding: "10px 0", borderTop: "1px solid var(--border-subtle)" }}>
              #{p.rank} {p.supplier_name} ({p.country}) — save {p.savings_kg} kg ({p.savings_pct}%)
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

const label = { fontSize: "11px", fontWeight: "600", color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: "4px" };
const inputStyle = { width: "100%", padding: "7px 10px", border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)", background: "var(--bg-subtle)", color: "var(--text-primary)", fontSize: "12px" };
