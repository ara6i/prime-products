import type { IconProps } from "@/app/shared/types";

export function VerifiedCheckIcon({
  size = 16,
  color = "#1A7B3E",
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
        d="M8 1.33337C4.32 1.33337 1.33333 4.32004 1.33333 8.00004C1.33333 11.68 4.32 14.6667 8 14.6667C11.68 14.6667 14.6667 11.68 14.6667 8.00004C14.6667 4.32004 11.68 1.33337 8 1.33337ZM6.66667 11.3334L3.33333 8.00004L4.27333 7.06004L6.66667 9.44671L11.7267 4.38671L12.6667 5.33337L6.66667 11.3334Z"
        fill={color}
      />
    </svg>
  );
}
