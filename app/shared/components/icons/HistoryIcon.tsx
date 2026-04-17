import type { IconProps } from "@/app/shared/types";

export function HistoryIcon({
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
        d="M8.666 2C5.353 2 2.666 4.687 2.666 8H.666l2.593 2.593.047.094L5.999 8H4C4 5.42 6.086 3.333 8.666 3.333c2.58 0 4.667 2.087 4.667 4.667 0 2.58-2.087 4.667-4.667 4.667a4.647 4.647 0 01-3.293-1.374l-.947.947A6.316 6.316 0 008.666 14c3.313 0 6-2.687 6-6s-2.687-6-6-6zM8 5.333v3.334l2.853 1.693.48-.807L9 8.167V5.333H8z"
        fill={color}
      />
    </svg>
  );
}
