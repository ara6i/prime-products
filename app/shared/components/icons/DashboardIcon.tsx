import type { IconProps } from "@/app/shared/types";

export function DashboardIcon({
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
      <g clipPath="url(#dashboard-clip)">
        <path
          d="M23.75 6.25V8.75H18.75V6.25H23.75ZM11.25 6.25V13.75H6.25V6.25H11.25ZM23.75 16.25V23.75H18.75V16.25H23.75ZM11.25 21.25V23.75H6.25V21.25H11.25ZM26.25 3.75H16.25V11.25H26.25V3.75ZM13.75 3.75H3.75V16.25H13.75V3.75ZM26.25 13.75H16.25V26.25H26.25V13.75ZM13.75 18.75H3.75V26.25H13.75V18.75Z"
          fill={color}
        />
      </g>
      <defs>
        <clipPath id="dashboard-clip">
          <rect width="30" height="30" fill="white" />
        </clipPath>
      </defs>
    </svg>
  );
}
