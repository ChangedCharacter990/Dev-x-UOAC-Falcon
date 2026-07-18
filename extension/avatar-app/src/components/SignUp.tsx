import { useState } from "react";

interface SignUpProps {
  onSignUp: (name: string) => void;
}

export function SignUp({ onSignUp }: SignUpProps) {
  const [name, setName] = useState("");

  const canContinue = name.trim().length > 0;

  return (
    <div style={{ width: 260, padding: 20, fontFamily: "system-ui, sans-serif", textAlign: "center" }}>
      <p
        style={{
          fontSize: 11,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          color: "#94a3b8",
          margin: "0 0 4px",
        }}
      >
        Net Worth Predictor
      </p>
      <p style={{ fontSize: 15, fontWeight: 600, margin: "0 0 4px", color: "#e2e8f0" }}>
        Welcome
      </p>
      <p style={{ fontSize: 11, color: "#64748b", margin: "0 0 16px" }}>
        First, let's get to know you.
      </p>

      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && canContinue) onSignUp(name.trim());
        }}
        placeholder="Your name"
        autoFocus
        style={{
          width: "100%",
          padding: 10,
          marginBottom: 12,
          fontSize: 13,
          border: "1px solid #334155",
          borderRadius: 6,
          background: "#1e293b",
          color: "#f8fafc",
          boxSizing: "border-box",
        }}
      />

      <button
        disabled={!canContinue}
        onClick={() => onSignUp(name.trim())}
        style={{
          width: "100%",
          padding: 10,
          border: "none",
          borderRadius: 6,
          background: canContinue ? "#16a34a" : "#1e293b",
          color: canContinue ? "#f8fafc" : "#64748b",
          cursor: canContinue ? "pointer" : "not-allowed",
          fontSize: 13,
          fontWeight: 600,
        }}
      >
        Continue
      </button>
    </div>
  );
}
