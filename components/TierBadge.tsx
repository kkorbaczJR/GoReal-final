import { TIERS } from "@/lib/league";

/** One simple shape per league tier, in black with the warm accent. */
export default function TierBadge({ tier, size = 56, locked = false, current = false }: { tier: number; size?: number; locked?: boolean; current?: boolean }) {
  const fill = locked ? "#e8e6dc" : current ? "#d97757" : "#1f1e1d";
  const inner = locked ? "#c9c6bb" : "#faf9f5";
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" role="img" aria-label={`${TIERS[tier].name} league`}>
      <circle cx="32" cy="32" r="29" fill={fill} />
      <g fill={inner} stroke={inner}>
        {tier === 0 && <ellipse cx="32" cy="35" rx="13" ry="9" />}
        {tier === 1 && <path d="M20 42 C20 26 32 20 44 20 C44 34 36 44 20 42 Z M22 40 L36 28" strokeWidth="2" />}
        {tier === 2 && (
          <path d="M32 16 c2 6 10 10 10 20 a10 10 0 0 1 -20 0 c0 -5 3 -8 5 -10 c0 3 2 6 4 6 c-1 -6 0 -12 1 -16 Z" />
        )}
        {tier === 3 && <path d="M38 18 a15 15 0 1 0 8 26 a12 12 0 1 1 -8 -26 Z" />}
        {tier === 4 && <path d="M32 16 l4.5 10 l11 1 l-8.5 7.5 l2.5 10.5 l-9.5 -5.5 l-9.5 5.5 l2.5 -10.5 l-8.5 -7.5 l11 -1 Z" />}
      </g>
    </svg>
  );
}
