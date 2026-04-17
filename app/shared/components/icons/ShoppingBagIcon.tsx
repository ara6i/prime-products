import type { IconProps } from "@/app/shared/types";

export function ShoppingBagIcon({
  size = 24,
  color = "currentColor",
  className,
}: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M36 14H32C32 9.58 28.42 6 24 6C19.58 6 16 9.58 16 14H12C9.8 14 8 15.8 8 18V38C8 40.2 9.8 42 12 42H36C38.2 42 40 40.2 40 38V18C40 15.8 38.2 14 36 14ZM24 10C26.2 10 28 11.8 28 14H20C20 11.8 21.8 10 24 10ZM36 38H12V18H16V22C16 23.1 16.9 24 18 24C19.1 24 20 23.1 20 22V18H28V22C28 23.1 28.9 24 30 24C31.1 24 32 23.1 32 22V18H36V38Z"
        fill={color}
      />
    </svg>
  );
}
