import type { IconProps } from "@/app/shared/types";

export function CircleFillIcon({ size = 12, color = "currentColor", className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill={color} xmlns="http://www.w3.org/2000/svg" className={className}>
      <circle cx={6} cy={6} r={5} />
    </svg>
  );
}
