import type { IconProps } from "@/app/shared/types";

export function ChevronDownSmallIcon({
  size = 16,
  color = "currentColor",
  className,
}: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M4.94 5.72667L8 8.78L11.06 5.72667L12 6.66667L8 10.6667L4 6.66667L4.94 5.72667Z"
        fill={color}
      />
    </svg>
  );
}
