"use client";

declare global {
  interface Window {
    gtag: (command: string, action: string, params?: Record<string, string>) => void;
  }
}

export default function Home() {
  return (
    <div className="relative min-h-[100dvh] w-full bg-black overflow-hidden flex items-center justify-center px-5 py-12 sm:px-8 sm:py-16 md:p-0">
      {/* Animated gradient orbs */}
      <div className="absolute top-1/4 left-1/4 w-48 md:w-96 h-48 md:h-96 bg-yellow-500/20 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-40 md:w-80 h-40 md:h-80 bg-amber-500/15 rounded-full blur-3xl animate-pulse delay-1000" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] md:w-[600px] h-[300px] md:h-[600px] bg-yellow-600/10 rounded-full blur-3xl" />

      {/* Grid pattern overlay */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `linear-gradient(rgba(212, 175, 55, 0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(212, 175, 55, 0.3) 1px, transparent 1px)`,
          backgroundSize: '30px 30px'
        }}
      />

      {/* Content */}
      <div className="relative z-10 text-center w-full max-w-4xl mx-auto">
        {/* Decorative line */}
        <div className="flex items-center justify-center gap-2 sm:gap-4 mb-5 sm:mb-8 md:mb-10">
          <div className="h-px w-10 sm:w-16 md:w-32 bg-gradient-to-r from-transparent to-[#D4AF37]" />
          <div className="w-2 h-2 sm:w-3 sm:h-3 rotate-45 border border-[#D4AF37] sm:border-2" />
          <div className="h-px w-10 sm:w-16 md:w-32 bg-gradient-to-l from-transparent to-[#D4AF37]" />
        </div>

        {/* Brand name */}
        <p className="text-gray-400 text-[11px] sm:text-sm md:text-base tracking-[0.3em] sm:tracking-[0.4em] uppercase mb-4 sm:mb-6">
          PrimeStyle AI
        </p>

        {/* Tagline */}
        <h1 className="text-[1.65rem] leading-[1.2] sm:text-3xl md:text-5xl lg:text-6xl font-bold tracking-wide text-transparent bg-clip-text bg-gradient-to-b from-[#D4AF37] via-[#F4D03F] to-[#D4AF37] mb-2 sm:mb-4 md:mb-5 px-2 sm:px-0">
          See How Clothes Look on You
        </h1>
        <h2 className="text-[1.35rem] leading-[1.2] sm:text-2xl md:text-4xl lg:text-5xl font-bold tracking-wide text-transparent bg-clip-text bg-gradient-to-b from-[#D4AF37] via-[#F4D03F] to-[#D4AF37] mb-5 sm:mb-8 md:mb-10">
          Before You Buy
        </h2>

        {/* Description */}
        <p className="text-gray-400 text-[13px] leading-relaxed sm:text-base md:text-lg max-w-md sm:max-w-xl md:max-w-2xl mx-auto mb-7 sm:mb-10 md:mb-12 px-2 sm:px-0">
          AI-powered virtual fitting — try on any outfit from anywhere, anytime.
        </p>

        {/* CTA Button */}
        <a
          href="https://myaifitting.com"
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => {
            window.gtag?.("event", "click", {
              event_category: "outbound",
              event_label: "beta_website",
            });
          }}
          className="group inline-flex items-center gap-2.5 sm:gap-4 px-7 sm:px-10 md:px-14 py-3 sm:py-4 md:py-5 rounded-full border-2 border-[#D4AF37] hover:bg-[#D4AF37]/10 active:bg-[#D4AF37]/15 transition-all duration-500 hover:scale-105 active:scale-[0.98] hover:shadow-lg hover:shadow-[#D4AF37]/20"
        >
          <span className="text-[15px] sm:text-lg md:text-xl font-semibold tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-[#D4AF37] to-[#F4D03F]">
            Try the Beta
          </span>
          <span className="text-[#D4AF37] text-base sm:text-xl transition-transform duration-300 group-hover:translate-x-1">
            &rarr;
          </span>
        </a>

        {/* URL display */}
        <p className="mt-3 sm:mt-5 md:mt-6 text-xs sm:text-sm md:text-base tracking-[0.15em] sm:tracking-widest animate-url-glow">
          myaifitting.com
        </p>

        {/* Decorative bottom element */}
        <div className="flex items-center justify-center gap-1.5 sm:gap-2 mt-8 sm:mt-12 md:mt-14">
          <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-[#D4AF37] animate-pulse" />
          <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-[#D4AF37] animate-pulse delay-150" />
          <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-[#D4AF37] animate-pulse delay-300" />
        </div>
      </div>

      {/* Corner accents */}
      <div className="absolute top-3 left-3 sm:top-8 sm:left-8 w-6 h-6 sm:w-12 sm:h-12 md:w-16 md:h-16 border-l border-t sm:border-l-2 sm:border-t-2 border-[#D4AF37]/50" />
      <div className="absolute top-3 right-3 sm:top-8 sm:right-8 w-6 h-6 sm:w-12 sm:h-12 md:w-16 md:h-16 border-r border-t sm:border-r-2 sm:border-t-2 border-[#D4AF37]/50" />
      <div className="absolute bottom-3 left-3 sm:bottom-8 sm:left-8 w-6 h-6 sm:w-12 sm:h-12 md:w-16 md:h-16 border-l border-b sm:border-l-2 sm:border-b-2 border-[#D4AF37]/50" />
      <div className="absolute bottom-3 right-3 sm:bottom-8 sm:right-8 w-6 h-6 sm:w-12 sm:h-12 md:w-16 md:h-16 border-r border-b sm:border-r-2 sm:border-b-2 border-[#D4AF37]/50" />

      <style>{`
        @keyframes urlGlow {
          0%, 100% { color: #D4AF37; opacity: 0.6; }
          50% { color: #F4D03F; opacity: 1; }
        }
        .animate-url-glow {
          animation: urlGlow 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
