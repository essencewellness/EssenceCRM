export default function Loading() {
  return (
    <div style={{ maxWidth: "720px", margin: "0 auto", padding: "32px 24px" }}>
      <div className="skeleton" style={{ height: "28px", width: "200px", marginBottom: "8px" }} />
      <div className="skeleton" style={{ height: "16px", width: "280px", marginBottom: "32px" }} />
      <div className="skeleton" style={{ height: "36px", width: "140px", marginBottom: "28px", borderRadius: "4px" }} />
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="skeleton" style={{ height: "44px", borderRadius: "4px" }} />
        ))}
      </div>
    </div>
  )
}
