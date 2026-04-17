import type { IconProps } from "@/app/shared/types";

export function RotateRightIcon({
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
        d="M7.875 12.667C9.421 12.667 10.821 12.09 11.9 11.151L14 13.25V8H8.75L10.862 10.112C10.051 10.789 9.018 11.209 7.875 11.209C5.81 11.209 4.054 9.862 3.442 8L2.059 8.455C2.87 10.9 5.163 12.667 7.875 12.667Z"
        fill={color}
      />
    </svg>
  );
}
