import type { IconProps } from "@/app/shared/types";

export function PersonAddIcon({
  size = 120,
  color = "#E6E6E6",
  className,
}: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M65 40C65 28.95 56.05 20 45 20C33.95 20 25 28.95 25 40C25 51.05 33.95 60 45 60C56.05 60 65 51.05 65 40ZM75 50V60H90V75H100V60H115V50H100V35H90V50H75ZM5 90V100H85V90C85 76.7 58.35 70 45 70C31.65 70 5 76.7 5 90Z"
        fill={color}
      />
    </svg>
  );
}
