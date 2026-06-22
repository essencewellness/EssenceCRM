export default function Loading() {
  return (
    <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "32px 24px" }}>
      <div className="skeleton" style={{ height: "28px", width: "220px", marginBottom: "8px" }} />
      <div className="skeleton" style={{ height: "16px", width: "180px", marginBottom: "32px" }} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "24px" }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="skeleton" style={{ height: "96px", borderRadius: "8px" }} />
        ))}
      </div>
      <div className="skeleton" style={{ height: "300px", borderRadius: "8px" }} />
    </div>
  )
}
