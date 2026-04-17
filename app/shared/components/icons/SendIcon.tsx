import type { IconProps } from "@/app/shared/types";

export function SendIcon({
  size = 14,
  color = "currentColor",
  className,
}: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 14 14"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M1.172 12.25L13.416 7 1.172 1.75 1.166 5.833 9.916 7 1.166 8.167 1.172 12.25z"
        fill={color}
      />
    </svg>
  );
}
