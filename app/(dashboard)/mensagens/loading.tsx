export default function MensagensLoading() {
  return (
    <div style={{ maxWidth: "768px", margin: "0 auto" }}>
      <div style={{ width: "176px", height: "28px", borderRadius: "3px", backgroundColor: "rgba(212,184,134,0.08)", marginBottom: "24px", animation: "pulse 1.5s ease-in-out infinite" }} />
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} style={{ backgroundColor: "var(--nuit-overlay)", border: "1px solid rgba(212,184,134,0.12)", borderRadius: "2px", padding: "20px" }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: "12px", marginBottom: "12px" }}>
              <div style={{ width: "36px", height: "36px", borderRadius: "50%", backgroundColor: "rgba(185,160,122,0.08)", flexShrink: 0, animation: "pulse 1.5s ease-in-out infinite" }} />
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "6px" }}>
                <div style={{ height: "14px", width: "33%", borderRadius: "3px", backgroundColor: "rgba(212,184,134,0.08)", animation: "pulse 1.5s ease-in-out infinite" }} />
                <div style={{ height: "11px", width: "20%", borderRadius: "3px", backgroundColor: "rgba(212,184,134,0.05)", animation: "pulse 1.5s ease-in-out infinite" }} />
              </div>
              <div style={{ width: "64px", height: "22px", borderRadius: "2px", backgroundColor: "rgba(185,160,122,0.08)", animation: "pulse 1.5s ease-in-out infinite" }} />
            </div>
            <div style={{ marginLeft: "48px", display: "flex", flexDirection: "column", gap: "6px" }}>
              {[100, 80, 66].map((w, j) => (
                <div key={j} style={{ height: "11px", width: `${w}%`, borderRadius: "3px", backgroundColor: "rgba(212,184,134,0.06)", animation: "pulse 1.5s ease-in-out infinite" }} />
              ))}
            </div>
          </div>
        ))}
      </div>
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
    </div>
  )
}
