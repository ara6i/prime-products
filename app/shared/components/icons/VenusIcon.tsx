import type { IconProps } from "@/app/shared/types";

export function VenusIcon({ size = 24, color = "currentColor", className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
    >
      <circle cx="12" cy="9" r="5.5" stroke={color} strokeWidth="1.8" />
      <line x1="12" y1="14.5" x2="12" y2="21" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <line x1="9.5" y1="18" x2="14.5" y2="18" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
