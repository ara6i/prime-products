import type { IconProps } from "@/app/shared/types";

export function CloudUploadIcon({
  size = 56,
  color = "#ADB1B3",
  className,
}: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 56 56"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M44.3335 23.5667C42.7502 15.8667 35.9835 10 28.0002 10C21.7002 10 16.1702 13.5333 13.3002 18.7C5.8335 19.5067 0.333496 25.8767 0.333496 33.3333C0.333496 41.3167 6.6835 47.6667 14.6668 47.6667H43.5002C50.1302 47.6667 55.5835 42.2133 55.5835 35.5833C55.5835 29.26 50.6002 24.04 44.3335 23.5667ZM32.6668 30.3333V39.6667H23.3335V30.3333H16.3335L28.0002 18.6667L39.6668 30.3333H32.6668Z"
        fill={color}
      />
    </svg>
  );
}
