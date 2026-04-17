import type { IconProps } from "@/app/shared/types";

interface RadioIconProps extends IconProps {
  checked?: boolean;
}

export function RadioIcon({
  size = 20,
  checked = false,
  className,
}: RadioIconProps) {
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
        <>
          <circle cx="10" cy="10" r="9.375" stroke="#2154EF" strokeWidth="1.25" />
          <circle cx="10" cy="10" r="5" fill="#2154EF" />
        </>
      ) : (
        <circle cx="10" cy="10" r="9.375" stroke="#595D61" strokeWidth="1.25" />
      )}
    </svg>
  );
}
