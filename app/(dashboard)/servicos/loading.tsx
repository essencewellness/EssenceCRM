export default function Loading() {
  return (
    <div style={{ maxWidth: "900px", margin: "0 auto", padding: "32px 24px" }}>
      <div className="skeleton" style={{ height: "28px", width: "180px", marginBottom: "8px" }} />
      <div className="skeleton" style={{ height: "16px", width: "240px", marginBottom: "32px" }} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "16px" }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="skeleton" style={{ height: "120px", borderRadius: "8px" }} />
        ))}
      </div>
    </div>
  )
}
