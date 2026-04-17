import type { IconProps } from "@/app/shared/types";

export function ArrowRightIcon({
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
        d="M8 2.667L7.06 3.607L10.78 7.333H2.667V8.667H10.78L7.06 12.393L8 13.333L13.333 8L8 2.667Z"
        fill={color}
      />
    </svg>
  );
}
