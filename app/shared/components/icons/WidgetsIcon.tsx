import type { IconProps } from "@/app/shared/types";

export function WidgetsIcon({
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
      <g clipPath="url(#widgets-clip)">
        <path
          d="M13.8833 3.76654L16.2417 6.12487L13.8833 8.4832L11.525 6.12487L13.8833 3.76654ZM7.5 4.16654V7.49987H4.16667V4.16654H7.5ZM15.8333 12.4999V15.8332H12.5V12.4999H15.8333ZM7.5 12.4999V15.8332H4.16667V12.4999H7.5ZM13.8833 1.4082L9.16667 6.11654L13.8833 10.8332L18.6 6.11654L13.8833 1.4082ZM9.16667 2.49987H2.5V9.16654H9.16667V2.49987ZM17.5 10.8332H10.8333V17.4999H17.5V10.8332ZM9.16667 10.8332H2.5V17.4999H9.16667V10.8332Z"
          fill={color}
        />
      </g>
      <defs>
        <clipPath id="widgets-clip">
          <rect width="20" height="20" fill="white" />
        </clipPath>
      </defs>
    </svg>
  );
}
