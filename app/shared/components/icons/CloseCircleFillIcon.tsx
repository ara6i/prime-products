import type { IconProps } from "@/app/shared/types";

export function CloseCircleFillIcon({ size = 12, color = "currentColor", className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill={color} xmlns="http://www.w3.org/2000/svg" className={className}>
      <path d="M6 1C3.24 1 1 3.24 1 6s2.24 5 5 5 5-2.24 5-5S8.76 1 6 1zm2.5 6.795-.705.705L6 6.705 4.205 8.5l-.705-.705L5.295 6 3.5 4.205l.705-.705L6 5.295 7.795 3.5l.705.705L6.705 6 8.5 7.795z" />
    </svg>
  );
}
