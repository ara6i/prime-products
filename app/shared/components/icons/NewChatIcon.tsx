import type { IconProps } from "@/app/shared/types";

export function NewChatIcon({
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
        d="M14.667 2.665c0-.733-.6-1.333-1.333-1.333H2.667c-.733 0-1.333.6-1.333 1.333v8c0 .733.6 1.333 1.333 1.333H12l2.667 2.667V2.665zM13.334 11.445l-.78-.78H2.667V2.665h10.667v8.78zM8.667 3.332H7.334v2.666H4.667v1.334h2.667v2.666h1.333V7.332h2.667V5.998H8.667V3.332z"
        fill={color}
      />
    </svg>
  );
}
