import type { IconProps } from "@/app/shared/types";

export function MarsIcon({ size = 24, color = "currentColor", className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
    >
      <circle cx="10" cy="14" r="5.5" stroke={color} strokeWidth="1.8" />
      <line x1="14.5" y1="9.5" x2="19.5" y2="4.5" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <polyline points="15,4.5 19.5,4.5 19.5,9" stroke={color} strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
