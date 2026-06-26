import type { IconProps } from "@/app/shared/types";

export function DocumentationIcon({
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
      aria-hidden="true"
    >
      <path
        d="M3.1 2.25H6.7C7.2 2.25 7.64 2.48 8 2.84C8.36 2.48 8.8 2.25 9.3 2.25H12.9C13.48 2.25 13.95 2.72 13.95 3.3V12.85C13.95 13.18 13.68 13.45 13.35 13.45H9.45C9 13.45 8.58 13.63 8.28 13.95C8.13 14.11 7.87 14.11 7.72 13.95C7.42 13.63 7 13.45 6.55 13.45H2.65C2.32 13.45 2.05 13.18 2.05 12.85V3.3C2.05 2.72 2.52 2.25 3.1 2.25ZM7.35 12.42V3.95C7.18 3.62 6.94 3.45 6.62 3.45H3.25V12.25H6.55C6.82 12.25 7.09 12.31 7.35 12.42ZM8.65 12.42C8.91 12.31 9.18 12.25 9.45 12.25H12.75V3.45H9.38C9.06 3.45 8.82 3.62 8.65 3.95V12.42Z"
        fill={color}
      />
    </svg>
  );
}
