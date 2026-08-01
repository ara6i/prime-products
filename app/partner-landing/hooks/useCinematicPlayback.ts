"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export function useCinematicPlayback(offsets: number[] = [0]) {
  const videoRefs = useRef<Array<HTMLVideoElement | null>>([]);
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(0);

  const registerVideo = useCallback(
    (index: number) => (node: HTMLVideoElement | null) => {
      videoRefs.current[index] = node;
      if (!node) return;
      const offset = offsets[index] ?? 0;
      if (Number.isFinite(node.duration) && node.duration > offset) node.currentTime = offset;
    },
    [offsets],
  );

  const syncOffset = useCallback(
    (index: number) => {
      const node = videoRefs.current[index];
      const offset = offsets[index] ?? 0;
      if (node && Number.isFinite(node.duration) && node.duration > offset) node.currentTime = offset;
    },
    [offsets],
  );

  const updateProgress = useCallback(() => {
    const primary = videoRefs.current[0];
    if (!primary || !Number.isFinite(primary.duration) || primary.duration === 0) return;
    setProgress((primary.currentTime / primary.duration) * 100);
  }, []);

  const togglePlayback = useCallback(() => {
    setIsPlaying((current) => {
      const next = !current;
      videoRefs.current.forEach((video) => {
        if (!video) return;
        if (next) void video.play();
        else video.pause();
      });
      return next;
    });
  }, []);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!reducedMotion.matches) return;
    videoRefs.current.forEach((video) => video?.pause());
  }, []);

  return { isPlaying, progress, registerVideo, syncOffset, togglePlayback, updateProgress };
}
