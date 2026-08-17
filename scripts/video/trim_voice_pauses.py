#!/usr/bin/env python3
"""Cap long pauses in a PCM WAV without altering spoken audio."""

from __future__ import annotations

import argparse
import math
import wave
from pathlib import Path

import numpy as np


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("input", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--threshold-db", type=float, default=-42.0)
    parser.add_argument("--minimum-pause", type=float, default=0.45)
    parser.add_argument("--maximum-pause", type=float, default=0.45)
    parser.add_argument("--window-ms", type=float, default=10.0)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    with wave.open(str(args.input), "rb") as source:
        channels = source.getnchannels()
        sample_width = source.getsampwidth()
        sample_rate = source.getframerate()
        frames = source.readframes(source.getnframes())

    if sample_width != 2:
        raise ValueError("Only 16-bit PCM WAV files are supported")

    samples = np.frombuffer(frames, dtype="<i2").reshape(-1, channels)
    mono = samples.astype(np.float32).mean(axis=1)
    window = max(1, round(sample_rate * args.window_ms / 1000.0))
    usable = len(mono) - (len(mono) % window)
    rms = np.sqrt(np.mean(mono[:usable].reshape(-1, window) ** 2, axis=1))
    threshold = 32767.0 * math.pow(10.0, args.threshold_db / 20.0)
    silent_windows = rms < threshold

    intervals: list[tuple[int, int]] = []
    start: int | None = None
    for index, silent in enumerate(silent_windows):
        if silent and start is None:
            start = index
        elif not silent and start is not None:
            intervals.append((start * window, index * window))
            start = None
    if start is not None:
        intervals.append((start * window, len(samples)))

    minimum = round(sample_rate * args.minimum_pause)
    maximum = round(sample_rate * args.maximum_pause)
    pieces: list[np.ndarray] = []
    cursor = 0
    trimmed = 0
    for start_frame, end_frame in intervals:
        duration = end_frame - start_frame
        if duration < minimum or duration <= maximum:
            continue
        pieces.append(samples[cursor:start_frame])
        keep_left = maximum // 2
        keep_right = maximum - keep_left
        pieces.append(samples[start_frame : start_frame + keep_left])
        pieces.append(samples[end_frame - keep_right : end_frame])
        trimmed += duration - maximum
        cursor = end_frame
    pieces.append(samples[cursor:])
    output = np.concatenate(pieces, axis=0) if pieces else samples

    args.output.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(args.output), "wb") as target:
        target.setnchannels(channels)
        target.setsampwidth(sample_width)
        target.setframerate(sample_rate)
        target.writeframes(output.astype("<i2", copy=False).tobytes())

    print(
        f"trimmed={trimmed / sample_rate:.3f}s "
        f"duration={len(output) / sample_rate:.3f}s"
    )


if __name__ == "__main__":
    main()
