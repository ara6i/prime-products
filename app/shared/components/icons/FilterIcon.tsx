import type { IconProps } from "@/app/shared/types";

export function FilterIcon({
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
        d="M2.66667 4H13.3333V5.33333H2.66667V4ZM4.66667 7.33333H11.3333V8.66667H4.66667V7.33333ZM6.33333 10.6667H9.66667V12H6.33333V10.6667Z"
        fill={color}
      />
    </svg>
  );
}
