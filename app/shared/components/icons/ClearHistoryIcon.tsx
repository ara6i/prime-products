import type { IconProps } from "@/app/shared/types";

export function ClearHistoryIcon({
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
        d="M10.667 7.335H10V2.001c0-.733-.6-1.333-1.333-1.333H7.333C6.6.668 6 1.268 6 2.001v5.334H5.333c-1.84 0-3.333 1.493-3.333 3.333v4.667h12v-4.667c0-1.84-1.493-3.333-3.333-3.333zm2 6.666h-1.334v-2c0-.367-.3-.667-.666-.667-.367 0-.667.3-.667.667v2H8.667v-2c0-.367-.3-.667-.667-.667-.367 0-.667.3-.667.667v2H6v-2c0-.367-.3-.667-.667-.667-.366 0-.666.3-.666.667v2H3.333v-3.333c0-1.1.9-2 2-2h5.334c1.1 0 2 .9 2 2v3.333z"
        fill={color}
      />
    </svg>
  );
}
