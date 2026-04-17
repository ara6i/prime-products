import type { IconProps } from "@/app/shared/types";

export function ChevronRightSmallIcon({
  size = 14,
  color = "currentColor",
  className,
}: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path d="M5.01 3.5L8.68 7L5.01 10.5" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    </svg>
  );
}
