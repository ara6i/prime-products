import type { IconProps } from "@/app/shared/types";

export function CheckmarkSmallIcon({
  size = 10,
  color = "currentColor",
  className,
}: IconProps) {
  return (
    <svg
      width={size}
      height={(size / 10) * 8}
      viewBox="0 0 10 8"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M3.5 6.09L1.41 4L0.59 4.82L3.5 7.73L9.5 1.73L8.68 0.91L3.5 6.09Z"
        fill={color}
      />
    </svg>
  );
}
