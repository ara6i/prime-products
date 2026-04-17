import type { IconProps } from "@/app/shared/types";

export function RotateLeftIcon({
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
        d="M8.125 12.667C6.579 12.667 5.179 12.09 4.1 11.151L2 13.25V8H7.25L5.138 10.112C5.949 10.789 6.982 11.209 8.125 11.209C10.19 11.209 11.946 9.862 12.558 8L13.941 8.455C13.13 10.9 10.837 12.667 8.125 12.667Z"
        fill={color}
      />
    </svg>
  );
}
