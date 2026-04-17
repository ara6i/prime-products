import type { IconProps } from "@/app/shared/types";

export function ChevronDownIcon({
  size = 30,
  color = "currentColor",
  className,
}: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 30 30"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <g clipPath="url(#chevron-down-clip)">
        <path
          d="M8.2625 10.7375L14 16.4625L19.7375 10.7375L21.5 12.5L14 20L6.5 12.5L8.2625 10.7375Z"
          fill={color}
        />
      </g>
      <defs>
        <clipPath id="chevron-down-clip">
          <rect width="30" height="30" fill="white" />
        </clipPath>
      </defs>
    </svg>
  );
}
