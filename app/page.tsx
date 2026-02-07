"use client";

declare global {
  interface Window {
    gtag: (command: string, action: string, params?: Record<string, string>) => void;
  }
}

export default function Home() {
  return (
    <div className="relative min-h-screen w-full bg-black overflow-hidden flex items-center justify-center px-4 py-8 md:p-0">
      {/* Animated gradient orbs - smaller on mobile */}
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
      <div className="relative z-10 text-center px-2 sm:px-6 max-w-4xl mx-auto">
        {/* Decorative line */}
        <div className="flex items-center justify-center gap-2 sm:gap-4 mb-4 sm:mb-8">
          <div className="h-px w-8 sm:w-16 md:w-32 bg-gradient-to-r from-transparent to-[#D4AF37]" />
          <div className="w-2 h-2 sm:w-3 sm:h-3 rotate-45 border border-[#D4AF37] sm:border-2" />
          <div className="h-px w-8 sm:w-16 md:w-32 bg-gradient-to-l from-transparent to-[#D4AF37]" />
        </div>

        {/* Main heading */}
        <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-bold tracking-wider sm:tracking-widest text-transparent bg-clip-text bg-gradient-to-b from-[#D4AF37] via-[#F4D03F] to-[#D4AF37] mb-2 sm:mb-4">
          VISIT OUR
        </h1>
        <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-bold tracking-wider sm:tracking-widest text-transparent bg-clip-text bg-gradient-to-b from-[#D4AF37] via-[#F4D03F] to-[#D4AF37] mb-6 sm:mb-8">
          BETA
        </h1>

        {/* Subtitle */}
        <div className="mb-6 sm:mb-8 md:mb-12">
          <p className="text-gray-500 text-xs sm:text-sm md:text-base tracking-[0.2em] sm:tracking-[0.3em] uppercase mb-1 sm:mb-2">
            — Experience the future of fashion —
          </p>
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
            className="inline-block text-base sm:text-xl md:text-2xl font-light tracking-wide hover:scale-105 transition-transform duration-300"
            style={{
              background: 'linear-gradient(90deg, #D4AF37, #F4D03F, #D4AF37)',
              backgroundSize: '200% 100%',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              color: 'transparent',
              animation: 'subtleGlow 4s ease-in-out infinite',
            }}
          >
            myaifitting.com →
          </a>
        </div>

        {/* Kickstarter CTA */}
        <div className="flex flex-col items-center gap-4 sm:gap-6 md:gap-8">
          <p className="text-base sm:text-xl md:text-2xl lg:text-3xl font-semibold tracking-wide text-center shimmer-text leading-relaxed">
            Become a backer & support our Kickstarter
          </p>

          {/* Kickstarter Button */}
          <a
            href="https://www.kickstarter.com/projects/primestyleai/primestyleai-see-how-clothes-look-on-you-before-you-buy"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => {
              window.gtag?.("event", "click", {
                event_category: "outbound",
                event_label: "kickstarter_button",
              });
            }}
            className="inline-flex items-center gap-2 sm:gap-3 md:gap-4 px-4 sm:px-6 md:px-8 py-2.5 sm:py-3 md:py-4 bg-[#05CE78] hover:bg-[#04b86b] text-white font-semibold text-sm sm:text-base md:text-lg rounded-lg sm:rounded-xl transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-[#05CE78]/30"
          >
            <img
              src="/kik-logo.png"
              alt="Kickstarter"
              className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 object-contain"
            />
            <span className="border-l border-white/30 pl-2 sm:pl-3 md:pl-4">Notify me on launch</span>
          </a>
        </div>

        <style>{`
          .shimmer-text {
            background: linear-gradient(90deg, #ffffff 0%, #ffffff 40%, #05CE78 50%, #ffffff 60%, #ffffff 100%);
            background-size: 200% 100%;
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            animation: shimmer 6s ease-in-out infinite;
          }
          @keyframes shimmer {
            0% { background-position: 200% center; }
            100% { background-position: -200% center; }
          }
          @keyframes subtleGlow {
            0%, 100% { background-position: 0% center; opacity: 0.8; }
            50% { background-position: 100% center; opacity: 1; }
          }
        `}</style>

        {/* Decorative bottom element */}
        <div className="flex items-center justify-center gap-1.5 sm:gap-2 mt-8 sm:mt-12">
          <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-[#D4AF37] animate-pulse" />
          <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-[#D4AF37] animate-pulse delay-150" />
          <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-[#D4AF37] animate-pulse delay-300" />
        </div>
      </div>

      {/* Corner accents - smaller on mobile */}
      <div className="absolute top-4 left-4 sm:top-8 sm:left-8 w-8 h-8 sm:w-12 sm:h-12 md:w-16 md:h-16 border-l border-t sm:border-l-2 sm:border-t-2 border-[#D4AF37]/50" />
      <div className="absolute top-4 right-4 sm:top-8 sm:right-8 w-8 h-8 sm:w-12 sm:h-12 md:w-16 md:h-16 border-r border-t sm:border-r-2 sm:border-t-2 border-[#D4AF37]/50" />
      <div className="absolute bottom-4 left-4 sm:bottom-8 sm:left-8 w-8 h-8 sm:w-12 sm:h-12 md:w-16 md:h-16 border-l border-b sm:border-l-2 sm:border-b-2 border-[#D4AF37]/50" />
      <div className="absolute bottom-4 right-4 sm:bottom-8 sm:right-8 w-8 h-8 sm:w-12 sm:h-12 md:w-16 md:h-16 border-r border-b sm:border-r-2 sm:border-b-2 border-[#D4AF37]/50" />
    </div>
  );
}
