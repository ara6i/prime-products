import type { IconProps } from "@/app/shared/types";

export function BillingIcon({
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
      <g clipPath="url(#billing-clip)">
        <path
          d="M25 5H5C3.6125 5 2.5125 6.1125 2.5125 7.5L2.5 22.5C2.5 23.8875 3.6125 25 5 25H25C26.3875 25 27.5 23.8875 27.5 22.5V7.5C27.5 6.1125 26.3875 5 25 5ZM25 22.5H5V15H25V22.5ZM25 10H5V7.5H25V10Z"
          fill={color}
        />
      </g>
      <defs>
        <clipPath id="billing-clip">
          <rect width="30" height="30" fill="white" />
        </clipPath>
      </defs>
    </svg>
  );
}
