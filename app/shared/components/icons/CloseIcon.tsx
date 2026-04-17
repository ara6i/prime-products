import type { IconProps } from "@/app/shared/types";

export function CloseIcon({
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
        d="M12.6667 4.27333L11.7267 3.33333L8 7.06L4.27333 3.33333L3.33333 4.27333L7.06 8L3.33333 11.7267L4.27333 12.6667L8 8.94L11.7267 12.6667L12.6667 11.7267L8.94 8L12.6667 4.27333Z"
        fill={color}
      />
    </svg>
  );
}
