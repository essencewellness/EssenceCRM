export default function Loading() {
  return (
    <div style={{ maxWidth: "720px", margin: "0 auto", padding: "32px 24px" }}>
      <div className="skeleton" style={{ height: "28px", width: "200px", marginBottom: "8px" }} />
      <div className="skeleton" style={{ height: "16px", width: "260px", marginBottom: "32px" }} />
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} style={{ padding: "20px", border: "1px solid var(--border)", borderRadius: "8px" }}>
            <div className="skeleton" style={{ height: "16px", width: "140px", marginBottom: "12px" }} />
            <div className="skeleton" style={{ height: "38px", borderRadius: "4px" }} />
          </div>
        ))}
      </div>
    </div>
  )
}
