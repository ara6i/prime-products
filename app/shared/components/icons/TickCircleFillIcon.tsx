import type { IconProps } from "@/app/shared/types";

export function TickCircleFillIcon({ size = 12, color = "currentColor", className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill={color} xmlns="http://www.w3.org/2000/svg" className={className}>
      <path d="M6 1C3.24 1 1 3.24 1 6s2.24 5 5 5 5-2.24 5-5S8.76 1 6 1zm-1 7.5L2.5 6l.705-.705L5 7.085l3.795-3.795.705.71L5 8.5z" />
    </svg>
  );
}
