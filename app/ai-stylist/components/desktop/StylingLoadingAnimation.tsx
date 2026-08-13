"use client";

/* ─── Fashion Icon SVGs ─── */

const BagIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="h-full w-full">
    <path d="M18 6h-2c0-2.21-1.79-4-4-4S8 3.79 8 6H6c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-6-2c1.1 0 2 .9 2 2h-4c0-1.1.9-2 2-2zm6 16H6V8h2v2c0 .55.45 1 1 1s1-.45 1-1V8h4v2c0 .55.45 1 1 1s1-.45 1-1V8h2v12z" />
  </svg>
);

const DressIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="h-full w-full">
    <path d="M12 2L9 5v2H7.5C6.67 7 6 7.67 6 8.5V10l-2 8h5v4h6v-4h5l-2-8V8.5c0-.83-.67-1.5-1.5-1.5H15V5l-3-3zm0 2.5l1.5 1.5H13v3h-2V6H9.5L12 4.5zM8 9h8v1l1.72 6.88L17 17h-3v3h-4v-3H7l-.72-.12L8 10V9z" />
  </svg>
);

const HatIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="h-full w-full">
    <path d="M12 2C9.24 2 7 4.24 7 7v1H4c-1.1 0-2 .9-2 2v2h20v-2c0-1.1-.9-2-2-2h-3V7c0-2.76-2.24-5-5-5zm0 2c1.66 0 3 1.34 3 3v1H9V7c0-1.66 1.34-3 3-3zM2 14v2c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2v-2H2z" />
  </svg>
);

const ShoeIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="h-full w-full">
    <path d="M2 18h20v2H2v-2zm2-3c0-1.1.9-2 2-2h1l2-4h4l1 2h4c1.1 0 2 .9 2 2v2H4v-2zm14-1h-3l-.5-1H8.5l-1 2H6c-.55 0-1 .45-1 1H4v-1c0-1.1.9-2 2-2h1.5l1-2h5l.5 1H18c1.1 0 2 .9 2 2v1h-4z" />
  </svg>
);

const JewelryIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="h-full w-full">
    <path d="M12 2L4 7l8 5 8-5-8-5zm0 2.5L16.5 7 12 9.5 7.5 7 12 4.5zM4 9v6l8 5 8-5V9l-8 5-8-5zm8 9.5L7.5 16 12 13.5l4.5 2.5L12 18.5z" />
  </svg>
);

const WatchIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="h-full w-full">
    <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.2 3.2.8-1.3-4.5-2.7V7z" />
  </svg>
);

interface FloatingIconProps {
  Icon: React.FC;
  color: string;
  delay: string;
  x: number;
  y: number;
}

function FloatingIcon({ Icon, color, delay, x, y }: FloatingIconProps) {
  return (
    <div
      className="absolute h-[1.458vw] w-[1.458vw] lg:h-[1.875vw] lg:w-[1.875vw]"
      style={{
        color,
        left: `${50 + x}%`,
        top: `${50 + y}%`,
        filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.3))",
        animation: `fly-icon 2.5s ease-in-out infinite ${delay}`,
        opacity: 0,
      }}
    >
      <Icon />
    </div>
  );
}

const ICONS: FloatingIconProps[] = [
  { Icon: BagIcon, color: "#6035F2", delay: "0s", x: -35, y: -20 },
  { Icon: DressIcon, color: "#E8A0BF", delay: "0.4s", x: 30, y: -25 },
  { Icon: ShoeIcon, color: "#67E8F9", delay: "0.8s", x: 32, y: 5 },
  { Icon: HatIcon, color: "#9B8AFB", delay: "1.2s", x: -30, y: -35 },
  { Icon: JewelryIcon, color: "#6035F2", delay: "1.6s", x: 25, y: 25 },
  { Icon: WatchIcon, color: "#67E8F9", delay: "2s", x: -28, y: 20 },
];

interface StylingLoadingAnimationProps {
  modelImage?: string | null;
}

export function StylingLoadingAnimation({ modelImage }: StylingLoadingAnimationProps) {
  const fallback =
    "https://res.cloudinary.com/dgvtynla7/image/upload/v1759158306/uploads/models/Gemini_Generated_Image_wxdd66wxdd66wxdd_synj3e.png";

  return (
    <div className="relative h-full w-full overflow-hidden rounded-[0.833vw] bg-surface-light">
      {/* Model Image */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={modelImage || fallback}
        alt="Styling your look"
        className="absolute inset-0 h-full w-full object-cover"
      />

      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20" />

      {/* Floating fashion icons */}
      {ICONS.map((props, i) => (
        <FloatingIcon key={i} {...props} />
      ))}

      {/* Sparkle dots */}
      <div
        className="absolute left-1/4 top-1/4 h-[0.417vw] w-[0.417vw] rounded-full bg-accent-purple animate-ping opacity-60"
        style={{ animationDuration: "1.5s" }}
      />
      <div
        className="absolute right-1/3 top-1/3 h-[0.313vw] w-[0.313vw] rounded-full bg-white animate-ping opacity-40"
        style={{ animationDuration: "2s", animationDelay: "0.5s" }}
      />
      <div
        className="absolute bottom-1/3 left-1/3 h-[0.417vw] w-[0.417vw] rounded-full bg-[#E8A0BF] animate-ping opacity-50"
        style={{ animationDuration: "1.8s", animationDelay: "1s" }}
      />

      {/* Bottom progress pill */}
      <div className="absolute bottom-[0.833vw] left-1/2 z-10 -translate-x-1/2">
        <div className="flex items-center gap-[0.417vw] whitespace-nowrap rounded-full bg-black/60 px-[0.833vw] py-[0.417vw] backdrop-blur-md">
          <div className="flex shrink-0 gap-[0.208vw]">
            <div className="h-[0.417vw] w-[0.417vw] rounded-full bg-accent-purple animate-bounce" style={{ animationDelay: "0ms" }} />
            <div className="h-[0.417vw] w-[0.417vw] rounded-full bg-accent-purple animate-bounce" style={{ animationDelay: "150ms" }} />
            <div className="h-[0.417vw] w-[0.417vw] rounded-full bg-accent-purple animate-bounce" style={{ animationDelay: "300ms" }} />
          </div>
          <span className="text-[0.625vw] font-medium text-white">Creating outfits...</span>
        </div>
      </div>

      {/* Keyframes */}
      <style jsx>{`
        @keyframes fly-icon {
          0% {
            opacity: 0;
            transform: scale(0.5) translate(0, 0);
          }
          15% {
            opacity: 1;
            transform: scale(1.2) translate(0, 0);
          }
          50% {
            opacity: 1;
            transform: scale(1) translate(calc(var(--tw-translate-x, 0) * -0.5), calc(var(--tw-translate-y, 0) * -0.5));
          }
          85% {
            opacity: 0.6;
            transform: scale(0.6) translate(-50%, -50%);
          }
          100% {
            opacity: 0;
            transform: scale(0.3) translate(-50%, -50%);
          }
        }
      `}</style>
    </div>
  );
}
