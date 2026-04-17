import type { IconProps } from "@/app/shared/types";

export function ChevronLeftSmallIcon({
  size = 14,
  color = "currentColor",
  className,
}: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path d="M8.99 3.5L5.32 7L8.99 10.5" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    </svg>
  );
}
