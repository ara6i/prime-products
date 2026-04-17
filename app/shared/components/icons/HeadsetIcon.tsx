import type { IconProps } from "@/app/shared/types";

export function HeadsetIcon({
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
        d="M8 1.333C4.687 1.333 2 4.02 2 7.333V11.333C2 12.067 2.6 12.667 3.333 12.667H4.667C4.847 12.667 5.02 12.595 5.147 12.471C5.275 12.345 5.333 12.18 5.333 12V8.667C5.333 8.487 5.262 8.314 5.138 8.186C5.012 8.06 4.847 8 4.667 8H3.387C3.727 5.307 5.62 3.333 8 3.333C10.38 3.333 12.273 5.307 12.613 8H11.333C11.153 8 10.98 8.071 10.853 8.195C10.725 8.322 10.667 8.487 10.667 8.667V12C10.667 12.18 10.738 12.353 10.862 12.48C10.988 12.607 11.153 12.667 11.333 12.667H12.667C13.4 12.667 14 12.067 14 11.333V7.333C14 4.02 11.313 1.333 8 1.333Z"
        fill={color}
      />
    </svg>
  );
}
