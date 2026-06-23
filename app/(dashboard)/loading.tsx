export default function Loading() {
  return (
    <div style={{ maxWidth: "1024px", margin: "0 auto" }}>
      {/* Header skeleton */}
      <div style={{ marginBottom: "28px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "8px" }}>
          <div style={{
            width: "40px", height: "40px", borderRadius: "10px",
            backgroundColor: "rgba(185,160,122,0.08)",
            border: "1px solid rgba(185,160,122,0.15)",
          }} />
          <div>
            <div style={{
              width: "140px", height: "20px", borderRadius: "3px",
              backgroundColor: "rgba(212,184,134,0.08)",
              animation: "pulse 1.5s ease-in-out infinite",
            }} />
            <div style={{
              width: "80px", height: "12px", borderRadius: "3px",
              backgroundColor: "rgba(212,184,134,0.05)",
              marginTop: "6px",
              animation: "pulse 1.5s ease-in-out infinite",
            }} />
          </div>
        </div>
        <div style={{
          height: "1px",
          background: "linear-gradient(to right, transparent, rgba(185,160,122,0.20), transparent)",
          marginTop: "16px",
        }} />
      </div>

      {/* Cards skeleton */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "14px", marginBottom: "28px" }}>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} style={{
            backgroundColor: "var(--nuit-overlay)",
            border: "1px solid rgba(212,184,134,0.12)",
            borderRadius: "2px",
            padding: "20px 22px",
          }}>
            <div style={{
              width: "70%", height: "11px", borderRadius: "3px",
              backgroundColor: "rgba(212,184,134,0.08)",
              marginBottom: "14px",
              animation: "pulse 1.5s ease-in-out infinite",
            }} />
            <div style={{
              width: "50%", height: "28px", borderRadius: "3px",
              backgroundColor: "rgba(212,184,134,0.08)",
              marginBottom: "8px",
              animation: "pulse 1.5s ease-in-out infinite",
            }} />
            <div style={{
              width: "80%", height: "11px", borderRadius: "3px",
              backgroundColor: "rgba(212,184,134,0.05)",
              animation: "pulse 1.5s ease-in-out infinite",
            }} />
          </div>
        ))}
      </div>

      {/* Table skeleton */}
      <div style={{
        backgroundColor: "var(--nuit-overlay)",
        border: "1px solid rgba(212,184,134,0.12)",
        borderRadius: "2px",
        overflow: "hidden",
      }}>
        {/* Table header */}
        <div style={{
          display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr",
          padding: "12px 16px",
          backgroundColor: "rgba(212,184,134,0.05)",
          borderBottom: "1px solid rgba(212,184,134,0.12)",
          gap: "16px",
        }}>
          {[100, 80, 100, 60, 70].map((w, i) => (
            <div key={i} style={{
              width: `${w}%`, height: "10px", borderRadius: "3px",
              backgroundColor: "rgba(212,184,134,0.10)",
              animation: "pulse 1.5s ease-in-out infinite",
            }} />
          ))}
        </div>

        {/* Rows */}
        {[1, 2, 3, 4, 5, 6].map((row) => (
          <div key={row} style={{
            display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr",
            padding: "16px 16px",
            borderBottom: row < 6 ? "1px solid rgba(212,184,134,0.08)" : "none",
            gap: "16px",
            alignItems: "center",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{
                width: "34px", height: "34px", borderRadius: "50%", flexShrink: 0,
                backgroundColor: "rgba(185,160,122,0.08)",
                animation: "pulse 1.5s ease-in-out infinite",
              }} />
              <div style={{
                width: "65%", height: "14px", borderRadius: "3px",
                backgroundColor: "rgba(212,184,134,0.08)",
                animation: "pulse 1.5s ease-in-out infinite",
              }} />
            </div>
            {[75, 90, 60, 50].map((w, i) => (
              <div key={i} style={{
                width: `${w}%`, height: "13px", borderRadius: "3px",
                backgroundColor: "rgba(212,184,134,0.06)",
                animation: "pulse 1.5s ease-in-out infinite",
              }} />
            ))}
          </div>
        ))}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  )
}
