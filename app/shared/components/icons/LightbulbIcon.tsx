import type { IconProps } from "@/app/shared/types";

export function LightbulbIcon({
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
        d="M6 14C6 14.5533 6.44667 15 7 15H9C9.55333 15 10 14.5533 10 14V13.3333H6V14ZM8 1C5.24 1 3 3.24 3 6C3 7.82 3.92667 9.41333 5.33333 10.3133V12C5.33333 12.3667 5.63333 12.6667 6 12.6667H10C10.3667 12.6667 10.6667 12.3667 10.6667 12V10.3133C12.0733 9.41333 13 7.82 13 6C13 3.24 10.76 1 8 1Z"
        fill={color}
      />
    </svg>
  );
}
