"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";
import { cn } from "@/app/shared/lib/utils";

const VIDEO_SRC = "/videos/primestyleai-product-demo.mp4";
const VIDEO_POSTER = "/videos/primestyleai-product-demo-cover-20260623.png";

interface HeroVideoEditorProps {
  variant?: "desktop" | "mobile";
}

export function HeroVideoEditor({ variant = "desktop" }: HeroVideoEditorProps) {
  const compact = variant === "mobile";
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isHoveringVideo, setIsHoveringVideo] = useState(false);
  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const syncPlayback = () => setIsPlaying(!video.paused);
    video.addEventListener("play", syncPlayback);
    video.addEventListener("pause", syncPlayback);
    video.addEventListener("ended", syncPlayback);

    return () => {
      video.removeEventListener("play", syncPlayback);
      video.removeEventListener("pause", syncPlayback);
      video.removeEventListener("ended", syncPlayback);
    };
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = isMuted;
    if (!isMuted && video.volume === 0) {
      video.volume = 0.82;
    }
  }, [isMuted]);

  const togglePlayback = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.muted = false;
      video.volume = 0.82;
      setIsMuted(false);
      video.play().catch(() => setIsPlaying(false));
    } else {
      video.pause();
    }
  };

  const toggleSound = () => {
    const video = videoRef.current;
    if (!video) return;
    const nextMuted = !isMuted;
    video.muted = nextMuted;
    video.volume = nextMuted ? video.volume : 0.82;
    setIsMuted(nextMuted);
  };

  const movePlayCursor = (event: MouseEvent<HTMLButtonElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setCursorPosition({
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    });
  };

  return (
    <div
      className={cn(
        "relative overflow-hidden border border-brand-blue/12 bg-white shadow-[0_34px_90px_rgba(33,84,239,0.18)]",
        compact ? "rounded-[22px] p-1.5 shadow-[0_18px_46px_rgba(33,84,239,0.14)]" : "rounded-[2vw] p-[0.72vw]"
      )}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_8%,rgba(33,84,239,0.16),transparent_32%),linear-gradient(135deg,#FFFFFF_0%,#F4F8FF_100%)]" />

      <div className={cn("relative overflow-hidden border border-brand-blue/10 bg-brand-blue-pale/30 shadow-[0_20px_58px_rgba(15,23,42,0.10)]", compact ? "rounded-[18px]" : "rounded-[1.45vw]")}>
        <div className="group relative aspect-video">
          <button
            type="button"
            onClick={togglePlayback}
            onMouseEnter={(event) => {
              setIsHoveringVideo(true);
              movePlayCursor(event);
            }}
            onMouseMove={movePlayCursor}
            onMouseLeave={() => setIsHoveringVideo(false)}
            className="absolute inset-0 z-10 cursor-none"
            aria-label={isPlaying ? "Pause PrimeStyleAI video" : "Play PrimeStyleAI video"}
          />
          <video
            ref={videoRef}
            src={VIDEO_SRC}
            poster={VIDEO_POSTER}
            muted={isMuted}
            loop
            playsInline
            preload="none"
            className="absolute inset-0 h-full w-full object-cover"
          />
          {/* Keep the approved thumbnail visible until playback starts. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={VIDEO_POSTER}
            alt=""
            aria-hidden
            className={cn(
              "pointer-events-none absolute inset-0 z-[1] h-full w-full object-cover transition-opacity duration-300",
              isPlaying ? "opacity-0" : "opacity-100"
            )}
          />

          <div
            className={cn(
              "pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/70 bg-brand-blue text-white shadow-[0_20px_48px_rgba(33,84,239,0.32)] transition-[opacity,transform] duration-200",
              compact ? "flex h-14 w-14 items-center justify-center text-[9px] font-semibold uppercase tracking-[0.18em]" : "flex h-[5.3vw] w-[5.3vw] items-center justify-center text-[0.68vw] font-semibold uppercase tracking-[0.22em]",
              isHoveringVideo ? "scale-100 opacity-100" : "scale-75 opacity-0"
            )}
            style={{ left: cursorPosition.x, top: cursorPosition.y }}
          >
            {isPlaying ? "PAUSE" : "PLAY"}
          </div>

          <div className={cn("pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-brand-blue/15 bg-white/92 text-brand-blue shadow-[0_18px_38px_rgba(33,84,239,0.18)] transition-opacity group-hover:opacity-0", isPlaying ? "opacity-0" : "opacity-100", compact ? "flex h-12 w-12 items-center justify-center text-[9px] font-semibold tracking-[0.16em]" : "flex h-[4.6vw] w-[4.6vw] items-center justify-center text-[0.62vw] font-semibold tracking-[0.18em]")}>
            PLAY
          </div>

          <div className={cn("absolute z-30 flex items-center gap-2", compact ? "bottom-3 left-3" : "bottom-[0.9vw] left-[0.9vw]")}>
            <button
              type="button"
              onClick={togglePlayback}
              className={cn(
                "inline-flex items-center justify-center rounded-full border border-white/70 bg-white/92 text-brand-blue shadow-[0_14px_34px_rgba(33,84,239,0.18)] backdrop-blur transition hover:bg-brand-blue hover:text-white",
                compact ? "h-9 w-9" : "h-[2.25vw] w-[2.25vw]"
              )}
              aria-label={isPlaying ? "Pause PrimeStyleAI video" : "Play PrimeStyleAI video"}
            >
              {isPlaying ? <PauseIcon className={compact ? "h-3.5 w-3.5" : "h-[0.88vw] w-[0.88vw]"} /> : <PlayIcon className={compact ? "h-3.5 w-3.5" : "h-[0.88vw] w-[0.88vw]"} />}
            </button>
            <button
              type="button"
              onClick={toggleSound}
              className={cn(
                "inline-flex items-center justify-center rounded-full border border-white/70 bg-white/92 text-brand-blue shadow-[0_14px_34px_rgba(33,84,239,0.18)] backdrop-blur transition hover:bg-brand-blue hover:text-white",
                compact ? "h-9 w-9" : "h-[2.25vw] w-[2.25vw]"
              )}
              aria-pressed={!isMuted}
              aria-label={isMuted ? "Enable PrimeStyleAI video sound" : "Mute PrimeStyleAI video sound"}
            >
              {isMuted ? <VolumeOffIcon className={compact ? "h-3.5 w-3.5" : "h-[0.92vw] w-[0.92vw]"} /> : <VolumeOnIcon className={compact ? "h-3.5 w-3.5" : "h-[0.92vw] w-[0.92vw]"} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PlayIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M8 5.4v13.2L18.6 12 8 5.4z" />
    </svg>
  );
}

function PauseIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M7 5h3.6v14H7V5zm6.4 0H17v14h-3.6V5z" />
    </svg>
  );
}

function VolumeOnIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 9v6h4l5 4V5L8 9H4z" />
      <path d="M16 8.5a5 5 0 0 1 0 7" />
      <path d="M18.5 6a8.5 8.5 0 0 1 0 12" />
    </svg>
  );
}

function VolumeOffIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 9v6h4l5 4V5L8 9H4z" />
      <path d="m19 9-6 6" />
      <path d="m13 9 6 6" />
    </svg>
  );
}
