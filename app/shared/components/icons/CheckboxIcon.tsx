import type { IconProps } from "@/app/shared/types";

interface CheckboxIconProps extends IconProps {
  checked?: boolean;
}

export function CheckboxIcon({
  size = 20,
  checked = false,
  className,
}: CheckboxIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {checked ? (
        <path
          d="M16.6667 0H3.33333C1.5 0 0 1.5 0 3.33333V16.6667C0 18.5 1.5 20 3.33333 20H16.6667C18.5 20 20 18.5 20 16.6667V3.33333C20 1.5 18.5 0 16.6667 0ZM8.33333 15L3.33333 10L4.51667 8.81667L8.33333 12.6167L15.4833 5.46667L16.6667 6.66667L8.33333 15Z"
          fill="#2154EF"
        />
      ) : (
        <rect
          x="0.625"
          y="0.625"
          width="18.75"
          height="18.75"
          rx="3.375"
          stroke="#595D61"
          strokeWidth="1.25"
        />
      )}
    </svg>
  );
}
