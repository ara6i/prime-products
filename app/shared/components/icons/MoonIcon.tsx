import type { IconProps } from "@/app/shared/types";

export function MoonIcon({
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
        d="M20.4 14.2C19.35 17.65 16.12 20.16 12.3 20.16C7.63 20.16 3.84 16.37 3.84 11.7C3.84 7.88 6.35 4.65 9.8 3.6C9.36 4.62 9.12 5.75 9.12 6.93C9.12 11.32 12.68 14.88 17.07 14.88C18.25 14.88 19.38 14.64 20.4 14.2Z"
        stroke={color}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
