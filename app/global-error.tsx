"use client";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ padding: 24, color: "#e6e6e6", background: "#0b0e14", minHeight: "100vh", fontFamily: "ui-monospace, monospace", margin: 0 }}>
        <h2 style={{ color: "#ff6b6b", marginBottom: 12 }}>Application error (root)</h2>
        <pre data-testid="global-error-message" style={{ whiteSpace: "pre-wrap", background: "#11151f", padding: 12, borderRadius: 8, color: "#ffd166" }}>{String(error?.message || "(no message)")}</pre>
        <pre data-testid="global-error-stack" style={{ whiteSpace: "pre-wrap", background: "#11151f", padding: 12, borderRadius: 8, fontSize: 11, opacity: 0.85, marginTop: 8 }}>{String(error?.stack || "(no stack)")}</pre>
        <button onClick={() => reset()} style={{ marginTop: 16, padding: "8px 16px", borderRadius: 8, background: "#2563eb", color: "#fff", border: "none", cursor: "pointer" }}>Try again</button>
      </body>
    </html>
  );
}
