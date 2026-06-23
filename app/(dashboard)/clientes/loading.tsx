export default function ClientesLoading() {
  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
        <div style={{ width: "140px", height: "28px", borderRadius: "3px", backgroundColor: "rgba(212,184,134,0.08)", animation: "pulse 1.5s ease-in-out infinite" }} />
        <div style={{ width: "120px", height: "36px", borderRadius: "2px", backgroundColor: "rgba(212,184,134,0.06)", animation: "pulse 1.5s ease-in-out infinite" }} />
      </div>
      <div style={{ height: "38px", width: "100%", borderRadius: "2px", backgroundColor: "rgba(212,184,134,0.06)", marginBottom: "16px", animation: "pulse 1.5s ease-in-out infinite" }} />
      <div style={{ backgroundColor: "var(--nuit-overlay)", border: "1px solid rgba(212,184,134,0.12)", borderRadius: "2px", overflow: "hidden" }}>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: "16px", padding: "16px", borderBottom: i < 7 ? "1px solid rgba(212,184,134,0.08)" : "none" }}>
            <div style={{ width: "34px", height: "34px", borderRadius: "50%", backgroundColor: "rgba(185,160,122,0.08)", flexShrink: 0, animation: "pulse 1.5s ease-in-out infinite" }} />
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "6px" }}>
              <div style={{ height: "14px", width: "33%", borderRadius: "3px", backgroundColor: "rgba(212,184,134,0.08)", animation: "pulse 1.5s ease-in-out infinite" }} />
              <div style={{ height: "11px", width: "25%", borderRadius: "3px", backgroundColor: "rgba(212,184,134,0.05)", animation: "pulse 1.5s ease-in-out infinite" }} />
            </div>
            <div style={{ width: "80px", height: "22px", borderRadius: "2px", backgroundColor: "rgba(212,184,134,0.06)", animation: "pulse 1.5s ease-in-out infinite" }} />
            <div style={{ width: "96px", height: "13px", borderRadius: "3px", backgroundColor: "rgba(212,184,134,0.06)", animation: "pulse 1.5s ease-in-out infinite" }} />
          </div>
        ))}
      </div>
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
    </div>
  )
}
