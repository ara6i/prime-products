import type { IconProps } from "@/app/shared/types";

export function DeleteIcon({
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
        d="M4 12.67C4 13.4 4.6 14 5.33 14H10.67C11.4 14 12 13.4 12 12.67V4.67H4V12.67ZM12.67 2.67H10.33L9.67 2H6.33L5.67 2.67H3.33V4H12.67V2.67Z"
        fill={color}
      />
    </svg>
  );
}
