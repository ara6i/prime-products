import type { IconProps } from "@/app/shared/types";

export function HandymanIcon({
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
        d="M14.23 12.83L8.53 7.13C9.11 5.73 8.81 4.13 7.63 2.93C6.43 1.73 4.63 1.43 3.13 2.03L5.43 4.33L4.03 5.73L1.63 3.43C1.03 4.93 1.33 6.73 2.53 7.93C3.73 9.13 5.53 9.43 6.93 8.83L12.63 14.53C12.83 14.73 13.13 14.73 13.33 14.53L14.23 13.63C14.43 13.43 14.43 13.03 14.23 12.83Z"
        fill={color}
      />
    </svg>
  );
}
