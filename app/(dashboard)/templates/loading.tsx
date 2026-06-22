export default function Loading() {
  return (
    <div style={{ maxWidth: "900px", margin: "0 auto", padding: "32px 24px" }}>
      <div className="skeleton" style={{ height: "28px", width: "200px", marginBottom: "8px" }} />
      <div className="skeleton" style={{ height: "16px", width: "300px", marginBottom: "32px" }} />
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="skeleton" style={{ height: "80px", borderRadius: "6px" }} />
        ))}
      </div>
    </div>
  )
}
