import { useEffect, useState } from "react";
import { AvatarRenderer } from "./AvatarRenderer";
import { Identity } from "../lib/types";
import {
  BODY_CHOICES,
  DEFAULT_IDENTITY,
  HAIR_COLOR_CHOICES,
  HAIR_STYLE_CHOICES,
  SKIN_TONE_CHOICES,
} from "../lib/identityOptions";

interface CharacterCreatorProps {
  onCreate: (identity: Identity) => void;
}

const optionButtonStyle = (active: boolean): React.CSSProperties => ({
  padding: "4px 10px",
  fontSize: 11,
  borderRadius: 6,
  border: active ? "1px solid #4ade80" : "1px solid #334155",
  background: active ? "#14532d" : "#1e293b",
  color: "#f8fafc",
  cursor: "pointer",
});

const swatchStyle = (color: string, active: boolean): React.CSSProperties => ({
  width: 24,
  height: 24,
  borderRadius: "50%",
  background: color,
  border: active ? "2px solid #4ade80" : "2px solid #334155",
  cursor: "pointer",
  padding: 0,
});

export function CharacterCreator({ onCreate }: CharacterCreatorProps) {
  const [identity, setIdentity] = useState<Identity>(DEFAULT_IDENTITY);

  useEffect(() => {
    chrome.storage.local.set({ avatarPreviewIdentity: identity });
  }, [identity]);

  return (
    <div style={{ width: 280, padding: 20, fontFamily: "system-ui, sans-serif" }}>
      <p
        style={{
          fontSize: 11,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          color: "#94a3b8",
          margin: "0 0 4px",
          textAlign: "center",
        }}
      >
        Create Your Character
      </p>
      <p style={{ fontSize: 10, color: "#64748b", margin: "0 0 12px", textAlign: "center" }}>
        This is permanent — your outfit will change with your net worth, but
        who you are won't.
      </p>

      <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}>
        <AvatarRenderer identity={identity} tier="average" size={140} />
      </div>

      <Field label="Body">
        {BODY_CHOICES.map((c) => (
          <button
            key={c.value}
            style={optionButtonStyle(identity.body === c.value)}
            onClick={() => setIdentity({ ...identity, body: c.value })}
          >
            {c.label}
          </button>
        ))}
      </Field>

      <Field label="Hair">
        {HAIR_STYLE_CHOICES.map((c) => (
          <button
            key={c.value}
            style={optionButtonStyle(identity.hairStyle === c.value)}
            onClick={() => setIdentity({ ...identity, hairStyle: c.value })}
          >
            {c.label}
          </button>
        ))}
      </Field>

      <Field label="Hair color">
        {HAIR_COLOR_CHOICES.map((c) => (
          <button
            key={c.value}
            aria-label={`hair color ${c.value}`}
            style={swatchStyle(c.swatch, identity.hairColor === c.value)}
            onClick={() => setIdentity({ ...identity, hairColor: c.value })}
          />
        ))}
      </Field>

      <Field label="Skin tone">
        {SKIN_TONE_CHOICES.map((c) => (
          <button
            key={c.value}
            aria-label={`skin tone ${c.value}`}
            style={swatchStyle(c.swatch, identity.skin === c.value)}
            onClick={() => setIdentity({ ...identity, skin: c.value })}
          />
        ))}
      </Field>

      <button
        onClick={() => onCreate(identity)}
        style={{
          width: "100%",
          padding: 10,
          marginTop: 6,
          border: "none",
          borderRadius: 6,
          background: "#16a34a",
          color: "#f8fafc",
          cursor: "pointer",
          fontSize: 13,
          fontWeight: 600,
        }}
      >
        Start My Journey
      </button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <p style={{ fontSize: 11, color: "#94a3b8", margin: "0 0 6px" }}>{label}</p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{children}</div>
    </div>
  );
}
