import type { IconProps } from "@/app/shared/types";

export function ShareIcon({
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
        d="M12 10.72C11.49 10.72 11.04 10.92 10.69 11.23L5.94 8.47C5.97 8.32 6 8.16 6 8C6 7.84 5.97 7.68 5.94 7.53L10.64 4.79C11 5.12 11.47 5.33 12 5.33C13.11 5.33 14 4.44 14 3.33C14 2.22 13.11 1.33 12 1.33C10.89 1.33 10 2.22 10 3.33C10 3.49 10.03 3.65 10.06 3.8L5.36 6.54C5 6.21 4.53 6 4 6C2.89 6 2 6.89 2 8C2 9.11 2.89 10 4 10C4.53 10 5 9.79 5.36 9.46L10.1 12.23C10.07 12.37 10.05 12.52 10.05 12.67C10.05 13.74 10.92 14.61 12 14.61C13.08 14.61 13.95 13.74 13.95 12.67C13.95 11.59 13.07 10.72 12 10.72Z"
        fill={color}
      />
    </svg>
  );
}
