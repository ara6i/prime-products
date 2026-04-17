import type { IconProps } from "@/app/shared/types";

export function NotificationBellIcon({
  size = 20,
  color = "currentColor",
  className,
}: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <g clipPath="url(#bell-clip)">
        <path
          d="M10 17.3335C10.9167 17.3335 11.6667 16.5835 11.6667 15.6668H8.33337C8.33337 16.5835 9.08337 17.3335 10 17.3335ZM15 12.3335V8.16681C15 5.60848 13.6417 3.46681 11.25 2.90015V2.33348C11.25 1.64181 10.6917 1.08348 10 1.08348C9.30837 1.08348 8.75004 1.64181 8.75004 2.33348V2.90015C6.36671 3.46681 5.00004 5.60015 5.00004 8.16681V12.3335L3.33337 14.0001V14.8335H16.6667V14.0001L15 12.3335ZM13.3334 13.1668H6.66671V8.16681C6.66671 6.10015 7.92504 4.41681 10 4.41681C12.075 4.41681 13.3334 6.10015 13.3334 8.16681V13.1668Z"
          fill={color}
        />
      </g>
      <defs>
        <clipPath id="bell-clip">
          <rect width="20" height="20" fill="white" />
        </clipPath>
      </defs>
    </svg>
  );
}
