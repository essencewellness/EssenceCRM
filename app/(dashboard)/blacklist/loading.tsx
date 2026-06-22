export default function Loading() {
  return (
    <div style={{ maxWidth: "900px", margin: "0 auto", padding: "32px 24px" }}>
      <div className="skeleton" style={{ height: "28px", width: "160px", marginBottom: "8px" }} />
      <div className="skeleton" style={{ height: "16px", width: "280px", marginBottom: "32px" }} />
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="skeleton" style={{ height: "52px", borderRadius: "4px" }} />
        ))}
      </div>
    </div>
  )
}
