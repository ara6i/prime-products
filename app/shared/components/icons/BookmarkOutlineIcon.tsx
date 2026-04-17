import type { IconProps } from "@/app/shared/types";

export function BookmarkOutlineIcon({
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
        d="M12 2H4C3.26667 2 2.66667 2.6 2.66667 3.33333V14L8 11.3333L13.3333 14V3.33333C13.3333 2.6 12.7333 2 12 2ZM12 12L8 9.82667L4 12V3.33333H12V12Z"
        fill={color}
      />
    </svg>
  );
}
