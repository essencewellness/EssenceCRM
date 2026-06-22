export default function Loading() {
  return (
    <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "32px 24px" }}>
      <div className="skeleton" style={{ height: "20px", width: "120px", marginBottom: "20px", borderRadius: "4px" }} />
      <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "32px" }}>
        <div className="skeleton" style={{ width: "64px", height: "64px", borderRadius: "50%" }} />
        <div>
          <div className="skeleton" style={{ height: "28px", width: "240px", marginBottom: "8px" }} />
          <div className="skeleton" style={{ height: "16px", width: "180px" }} />
        </div>
      </div>
      <div style={{ display: "flex", gap: "8px", marginBottom: "24px" }}>
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="skeleton" style={{ height: "36px", width: "90px", borderRadius: "6px" }} />
        ))}
      </div>
      <div className="skeleton" style={{ height: "400px", borderRadius: "8px" }} />
    </div>
  )
}
