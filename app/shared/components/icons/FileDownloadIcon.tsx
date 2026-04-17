import type { IconProps } from "@/app/shared/types";

export function FileDownloadIcon({
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
        d="M12.67 6H10V2H6V6H3.33L8 10.67L12.67 6ZM3.33 12V13.33H12.67V12H3.33Z"
        fill={color}
      />
    </svg>
  );
}
