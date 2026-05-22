import type { IconProps } from "@/app/shared/types";

export function SunIcon({
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
        d="M12 17.25C14.8995 17.25 17.25 14.8995 17.25 12C17.25 9.1005 14.8995 6.75 12 6.75C9.1005 6.75 6.75 9.1005 6.75 12C6.75 14.8995 9.1005 17.25 12 17.25Z"
        stroke={color}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 2.75V4.25M12 19.75V21.25M4.25 12H2.75M21.25 12H19.75M6.52 6.52L5.46 5.46M18.54 18.54L17.48 17.48M17.48 6.52L18.54 5.46M5.46 18.54L6.52 17.48"
        stroke={color}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
