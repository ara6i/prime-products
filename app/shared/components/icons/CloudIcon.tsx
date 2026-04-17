import type { IconProps } from "@/app/shared/types";

export function CloudIcon({
  size = 24,
  color = "currentColor",
  className,
}: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M17.5 19H9a6.5 6.5 0 01-3.675-11.86A6.502 6.502 0 0115.71 10H17.5a4.5 4.5 0 010 9z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
