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
          background: "#faf9f5",
        }}
      >
        <svg width="180" height="180" viewBox="0 0 512 512">
          <path d="M256 128 C378 128 440 226 440 322 C440 404 368 440 256 440 C144 440 72 404 72 322 C72 226 134 128 256 128 Z" fill="#d97757" />
          <circle cx="200" cy="302" r="17" fill="#1f1e1d" />
          <circle cx="312" cy="302" r="17" fill="#1f1e1d" />
          <path d="M240 336 q16 16 32 0" stroke="#1f1e1d" strokeWidth="11" fill="none" strokeLinecap="round" />
          <ellipse cx="158" cy="344" rx="26" ry="16" fill="#f0a58a" />
          <ellipse cx="354" cy="344" rx="26" ry="16" fill="#f0a58a" />
        </svg>
      </div>
    ),
    size,
  );
}
