export default function Home() {
  return (
    <div className="relative min-h-screen w-full bg-black overflow-hidden flex items-center justify-center">
      {/* Animated gradient orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-yellow-500/20 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-amber-500/15 rounded-full blur-3xl animate-pulse delay-1000" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-yellow-600/10 rounded-full blur-3xl" />

      {/* Grid pattern overlay */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `linear-gradient(rgba(212, 175, 55, 0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(212, 175, 55, 0.3) 1px, transparent 1px)`,
          backgroundSize: '50px 50px'
        }}
      />

      {/* Content */}
      <div className="relative z-10 text-center px-6">
        {/* Decorative line */}
        <div className="flex items-center justify-center gap-4 mb-8">
          <div className="h-px w-16 md:w-32 bg-gradient-to-r from-transparent to-[#D4AF37]" />
          <div className="w-3 h-3 rotate-45 border-2 border-[#D4AF37]" />
          <div className="h-px w-16 md:w-32 bg-gradient-to-l from-transparent to-[#D4AF37]" />
        </div>

        {/* Main heading */}
        <h1 className="text-5xl md:text-8xl font-bold tracking-widest text-transparent bg-clip-text bg-gradient-to-b from-[#D4AF37] via-[#F4D03F] to-[#D4AF37] mb-4">
          COMING
        </h1>
        <h1 className="text-5xl md:text-8xl font-bold tracking-widest text-transparent bg-clip-text bg-gradient-to-b from-[#D4AF37] via-[#F4D03F] to-[#D4AF37] mb-8">
          SOON
        </h1>

        {/* Subtitle */}
        <p className="text-gray-400 text-lg md:text-xl tracking-wide mb-12 max-w-md mx-auto">
          Something amazing is on the way
        </p>

        {/* Decorative bottom element */}
        <div className="flex items-center justify-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#D4AF37] animate-pulse" />
          <div className="w-2 h-2 rounded-full bg-[#D4AF37] animate-pulse delay-150" />
          <div className="w-2 h-2 rounded-full bg-[#D4AF37] animate-pulse delay-300" />
        </div>
      </div>

      {/* Corner accents */}
      <div className="absolute top-8 left-8 w-16 h-16 border-l-2 border-t-2 border-[#D4AF37]/50" />
      <div className="absolute top-8 right-8 w-16 h-16 border-r-2 border-t-2 border-[#D4AF37]/50" />
      <div className="absolute bottom-8 left-8 w-16 h-16 border-l-2 border-b-2 border-[#D4AF37]/50" />
      <div className="absolute bottom-8 right-8 w-16 h-16 border-r-2 border-b-2 border-[#D4AF37]/50" />
    </div>
  );
}
