import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0b0b0c",
        }}
      >
        <svg width="180" height="180" viewBox="0 0 512 512">
          <ellipse cx="256" cy="290" rx="170" ry="150" fill="#ffffff" />
          <path d="M186 276 q24 22 48 0" stroke="#0b0b0c" strokeWidth="18" fill="none" strokeLinecap="round" />
          <path d="M278 276 q24 22 48 0" stroke="#0b0b0c" strokeWidth="18" fill="none" strokeLinecap="round" />
          <circle cx="168" cy="322" r="18" fill="#ff8a1f" />
          <circle cx="344" cy="322" r="18" fill="#ff8a1f" />
          <path d="M238 330 q18 16 36 0" stroke="#0b0b0c" strokeWidth="14" fill="none" strokeLinecap="round" />
        </svg>
      </div>
    ),
    size,
  );
}
