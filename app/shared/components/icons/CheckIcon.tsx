import type { IconProps } from "@/app/shared/types";

export function CheckIcon({
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
      <g clipPath="url(#check-clip)">
        <path
          d="M5.99998 10.7799L3.21998 7.9999L2.27332 8.9399L5.99998 12.6666L14 4.66656L13.06 3.72656L5.99998 10.7799Z"
          fill={color}
        />
      </g>
      <defs>
        <clipPath id="check-clip">
          <rect width="16" height="16" fill="white" />
        </clipPath>
      </defs>
    </svg>
  );
}
