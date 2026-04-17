import type { IconProps } from "@/app/shared/types";

export function FormatQuoteIcon({
  size = 24,
  color = "currentColor",
  className,
}: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M10.5 18H6V15C6 12.795 7.795 11 10 11H10.5C11.328 11 12 10.328 12 9.5V8.5C12 7.672 11.328 7 10.5 7H10C5.582 7 2 10.582 2 15V26C2 27.657 3.343 29 5 29H10.5C12.157 29 13.5 27.657 13.5 26V21C13.5 19.343 12.157 18 10.5 18ZM27.5 18H23V15C23 12.795 24.795 11 27 11H27.5C28.328 11 29 10.328 29 9.5V8.5C29 7.672 28.328 7 27.5 7H27C22.582 7 19 10.582 19 15V26C19 27.657 20.343 29 22 29H27.5C29.157 29 30.5 27.657 30.5 26V21C30.5 19.343 29.157 18 27.5 18Z"
        fill={color}
      />
    </svg>
  );
}
