/** Small flags for the language switch. Drawn, not emoji, so they match the rest of the app. */
export default function Flag({ code }: { code: "en" | "pl" }) {
  if (code === "pl") {
    return (
      <svg className="flag" viewBox="0 0 22 16" width="22" height="16" aria-hidden="true">
        <rect width="22" height="16" fill="#dc143c" />
        <rect width="22" height="8" fill="#ffffff" />
      </svg>
    );
  }
  return (
    <svg className="flag" viewBox="0 0 60 30" width="22" height="16" aria-hidden="true">
      <clipPath id="flag-en">
        <rect width="60" height="30" />
      </clipPath>
      <g clipPath="url(#flag-en)">
        <rect width="60" height="30" fill="#012169" />
        <path d="M0,0 L60,30 M60,0 L0,30" stroke="#ffffff" strokeWidth="6" />
        <path d="M0,0 L60,30 M60,0 L0,30" stroke="#C8102E" strokeWidth="2.5" />
        <path d="M30,0 V30 M0,15 H60" stroke="#ffffff" strokeWidth="10" />
        <path d="M30,0 V30 M0,15 H60" stroke="#C8102E" strokeWidth="6" />
      </g>
    </svg>
  );
}
