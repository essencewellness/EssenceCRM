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
              width: "140px", height: "20px", borderRadius: "6px",
              backgroundColor: "rgba(22,26,38,0.07)",
              animation: "pulse 1.5s ease-in-out infinite",
            }} />
            <div style={{
              width: "80px", height: "12px", borderRadius: "4px",
              backgroundColor: "rgba(22,26,38,0.05)",
              marginTop: "6px",
              animation: "pulse 1.5s ease-in-out infinite",
            }} />
          </div>
        </div>
        <div style={{
          height: "1px",
          background: "linear-gradient(to right, transparent, rgba(185,160,122,0.25), transparent)",
          marginTop: "16px",
        }} />
      </div>

      {/* Cards skeleton */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "14px", marginBottom: "28px" }}>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} style={{
            backgroundColor: "#ffffff",
            border: "1px solid #ddd6c4",
            borderRadius: "10px",
            padding: "20px 22px",
            boxShadow: "0 1px 3px rgba(22,26,38,0.05)",
          }}>
            <div style={{
              width: "70%", height: "11px", borderRadius: "4px",
              backgroundColor: "rgba(22,26,38,0.07)",
              marginBottom: "14px",
              animation: "pulse 1.5s ease-in-out infinite",
            }} />
            <div style={{
              width: "50%", height: "28px", borderRadius: "6px",
              backgroundColor: "rgba(22,26,38,0.07)",
              marginBottom: "8px",
              animation: "pulse 1.5s ease-in-out infinite",
            }} />
            <div style={{
              width: "80%", height: "11px", borderRadius: "4px",
              backgroundColor: "rgba(22,26,38,0.05)",
              animation: "pulse 1.5s ease-in-out infinite",
            }} />
          </div>
        ))}
      </div>

      {/* Table skeleton */}
      <div style={{
        backgroundColor: "#ffffff",
        border: "1px solid #ddd6c4",
        borderRadius: "12px",
        overflow: "hidden",
        boxShadow: "0 1px 3px rgba(22,26,38,0.05)",
        padding: "0",
      }}>
        {/* Table header */}
        <div style={{
          display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr",
          padding: "12px 16px",
          backgroundColor: "rgba(237,231,227,0.5)",
          borderBottom: "1px solid #ddd6c4",
          gap: "16px",
        }}>
          {[100, 80, 100, 60, 70].map((w, i) => (
            <div key={i} style={{
              width: `${w}%`, height: "10px", borderRadius: "4px",
              backgroundColor: "rgba(22,26,38,0.08)",
              animation: "pulse 1.5s ease-in-out infinite",
            }} />
          ))}
        </div>

        {/* Rows */}
        {[1, 2, 3, 4, 5, 6].map((row) => (
          <div key={row} style={{
            display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr",
            padding: "16px 16px",
            borderBottom: row < 6 ? "1px solid #e6e0d2" : "none",
            gap: "16px",
            alignItems: "center",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{
                width: "34px", height: "34px", borderRadius: "50%", flexShrink: 0,
                backgroundColor: "rgba(185,160,122,0.10)",
                animation: "pulse 1.5s ease-in-out infinite",
              }} />
              <div style={{
                width: "65%", height: "14px", borderRadius: "4px",
                backgroundColor: "rgba(22,26,38,0.07)",
                animation: "pulse 1.5s ease-in-out infinite",
              }} />
            </div>
            {[75, 90, 60, 50].map((w, i) => (
              <div key={i} style={{
                width: `${w}%`, height: "13px", borderRadius: "4px",
                backgroundColor: "rgba(22,26,38,0.06)",
                animation: "pulse 1.5s ease-in-out infinite",
              }} />
            ))}
          </div>
        ))}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.45; }
        }
      `}</style>
    </div>
  );
}
