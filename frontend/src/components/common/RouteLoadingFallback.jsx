export default function RouteLoadingFallback() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Loading page"
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "12px",
        fontFamily: "Roboto, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}
    >
      <style>{`@keyframes artmatch-spin { to { transform: rotate(360deg); } }`}</style>
      <div
        style={{
          width: "36px",
          height: "36px",
          borderRadius: "50%",
          border: "3px solid rgba(239, 51, 64, 0.2)",
          borderTopColor: "#ef3340",
          animation: "artmatch-spin 0.75s linear infinite",
        }}
      />
      <span style={{ fontSize: "14px", opacity: 0.75 }}>Loading...</span>
    </div>
  );
}
