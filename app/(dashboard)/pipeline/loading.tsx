export default function Loading() {
  return (
    <div style={{ maxWidth: "960px", margin: "0 auto", padding: "0 0 40px" }}>
      <div style={{ marginBottom: "28px" }}>
        <div style={{ width: "80px", height: "10px", backgroundColor: "rgba(212,184,134,0.12)", borderRadius: "2px", marginBottom: "10px" }} className="animate-pulse" />
        <div style={{ width: "120px", height: "28px", backgroundColor: "rgba(212,184,134,0.12)", borderRadius: "2px" }} className="animate-pulse" />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: "12px", marginBottom: "28px" }}>
        {[1,2,3,4,5,6].map(i => (
          <div key={i} style={{ backgroundColor: "var(--nuit-overlay)", border: "1px solid rgba(212,184,134,0.12)", borderRadius: "2px", height: "74px" }} className="animate-pulse" />
        ))}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} style={{ height: "60px", backgroundColor: i % 2 === 0 ? "var(--nuit-overlay)" : "rgba(31,36,51,0.5)", borderRadius: "2px" }} className="animate-pulse" />
        ))}
      </div>
    </div>
  );
}
