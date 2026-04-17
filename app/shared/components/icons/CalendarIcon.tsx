import type { IconProps } from "@/app/shared/types";

export function CalendarIcon({
  size = 14,
  color = "currentColor",
  className,
}: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 14 14"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M11.6667 1.75H10.7917V0.875H9.91667V1.75H4.08333V0.875H3.20833V1.75H2.33333C1.85208 1.75 1.45833 2.14375 1.45833 2.625V12.25C1.45833 12.7312 1.85208 13.125 2.33333 13.125H11.6667C12.1479 13.125 12.5417 12.7312 12.5417 12.25V2.625C12.5417 2.14375 12.1479 1.75 11.6667 1.75ZM11.6667 12.25H2.33333V5.25H11.6667V12.25ZM11.6667 4.375H2.33333V2.625H11.6667V4.375Z"
        fill={color}
      />
    </svg>
  );
}
