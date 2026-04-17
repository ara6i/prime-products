import type { IconProps } from "@/app/shared/types";

export function ChevronUpIcon({
  size = 30,
  color = "currentColor",
  className,
}: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 30 30"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M21.7375 19.2625L16 13.5375L10.2625 19.2625L8.5 17.5L16 10L23.5 17.5L21.7375 19.2625Z"
        fill={color}
      />
    </svg>
  );
}
