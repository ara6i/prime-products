import type { IconProps } from "@/app/shared/types";

export function ProfileIcon({
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
      <g clipPath="url(#profile-clip)">
        <path
          d="M15 7.375C16.45 7.375 17.625 8.55 17.625 10C17.625 11.45 16.45 12.625 15 12.625C13.55 12.625 12.375 11.45 12.375 10C12.375 8.55 13.55 7.375 15 7.375ZM15 18.625C18.7125 18.625 22.625 20.45 22.625 21.25V22.625H7.375V21.25C7.375 20.45 11.2875 18.625 15 18.625ZM15 5C12.2375 5 10 7.2375 10 10C10 12.7625 12.2375 15 15 15C17.7625 15 20 12.7625 20 10C20 7.2375 17.7625 5 15 5ZM15 16.25C11.6625 16.25 5 17.925 5 21.25V25H25V21.25C25 17.925 18.3375 16.25 15 16.25Z"
          fill={color}
        />
      </g>
      <defs>
        <clipPath id="profile-clip">
          <rect width="30" height="30" fill="white" />
        </clipPath>
      </defs>
    </svg>
  );
}
