import type { IconProps } from "@/app/shared/types";

export function GenerateIcon({
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
        d="M7.3158 14.1873L8.81455 10.8736L12.1283 9.37482L8.81455 7.87607L7.3158 4.56232L5.81705 7.87607L2.5033 9.37482L5.81705 10.8736L7.3158 14.1873ZM10.7533 7.31232L11.6058 5.41482L13.5033 4.56232L11.6058 3.70982L10.7533 1.81232L9.90079 3.70982L8.0033 4.56232L9.90079 5.41482L10.7533 7.31232Z"
        fill={color}
      />
    </svg>
  );
}
