import type { IconProps } from "@/app/shared/types";

export function LocalOfferIcon({
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
      <path
        d="M17.175 9.65833L10.3333 2.81667C10.0167 2.5 9.58333 2.33333 9.16667 2.33333H4.16667C3.25 2.33333 2.5 3.08333 2.5 4V9C2.5 9.41667 2.66667 9.83333 3 10.1417L9.84167 16.9833C10.5 17.6417 11.5667 17.6417 12.225 16.9833L17.175 12.0333C17.8333 11.375 17.8333 10.3167 17.175 9.65833ZM5.41667 6.25C4.95833 6.25 4.58333 5.875 4.58333 5.41667C4.58333 4.95833 4.95833 4.58333 5.41667 4.58333C5.875 4.58333 6.25 4.95833 6.25 5.41667C6.25 5.875 5.875 6.25 5.41667 6.25Z"
        fill={color}
      />
    </svg>
  );
}
