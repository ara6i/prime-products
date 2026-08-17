#!/bin/zsh
set -euo pipefail

VIS_ROOT="/Users/arashsn/.codex/visualizations/2026/08/17/01a00f39-cedf-76e2-9914-27ae07ef9902"
PROD_ROOT="$VIS_ROOT/prime-creator-video-production"
MOTION_ROOT="$PROD_ROOT/motion-scenes"
FINAL_ROOT="$PROD_ROOT/final"
mkdir -p "$FINAL_ROOT"

OPENING="$PROD_ROOT/seedance20-sofia-opening-sync-canary.mp4"
CLOSING="$PROD_ROOT/seedance20-sofia-closing-sync-raw.mp4"
NARRATION="$PROD_ROOT/bella-narration-pauses-capped.wav"
DISC="$VIS_ROOT/real-disc-refine/real-disc-final-motionized-60fps.mp4"

ffmpeg -hide_banner -loglevel error -y \
  -i "$OPENING" -t 3.45 \
  -vf "scale=720:1280:force_original_aspect_ratio=increase,crop=720:1280,fps=30,drawbox=x=233:y=0:w=7:h=1280:color=0xfbfaf8@1:t=fill,drawbox=x=480:y=0:w=7:h=1280:color=0xfbfaf8@1:t=fill,drawbox=x=0:y=0:w=9:h=1280:color=0x2154ef@1:t=fill,format=yuv420p" \
  -an -c:v libx264 -preset medium -crf 16 -movflags +faststart \
  "$FINAL_ROOT/01-hook-split-screen.mp4"

ffmpeg -hide_banner -loglevel error -y \
  -i "$MOTION_ROOT/scene-disc-environment.mp4" -i "$DISC" \
  -filter_complex "[0:v]trim=duration=6.05,setpts=PTS-STARTPTS[bg];[1:v]trim=start=0.45:duration=6.05,setpts=PTS-STARTPTS,scale=640:640:flags=lanczos[disc];[bg][disc]overlay=40:286:format=auto,fps=30,format=yuv420p[v]" \
  -map "[v]" -an -c:v libx264 -preset medium -crf 16 -movflags +faststart \
  "$FINAL_ROOT/03-exact-disc.mp4"

ffmpeg -hide_banner -loglevel error -y \
  -i "$MOTION_ROOT/scene-commission-dynamic.mp4" \
  -vf "tpad=stop_mode=clone:stop_duration=0.15,fps=30,format=yuv420p" \
  -t 4.90 -an -c:v libx264 -preset medium -crf 16 -movflags +faststart \
  "$FINAL_ROOT/04-commission-growth.mp4"

ffmpeg -hide_banner -loglevel error -y \
  -i "$FINAL_ROOT/01-hook-split-screen.mp4" \
  -i "$MOTION_ROOT/scene-network-atomic.mp4" \
  -i "$FINAL_ROOT/03-exact-disc.mp4" \
  -i "$FINAL_ROOT/04-commission-growth.mp4" \
  -i "$CLOSING" \
  -i "$MOTION_ROOT/scene-endcard-paper-carousel.mp4" \
  -filter_complex "[0:v]setpts=PTS-STARTPTS[v0];[1:v]fps=30,setpts=PTS-STARTPTS[v1];[2:v]setpts=PTS-STARTPTS[v2];[3:v]setpts=PTS-STARTPTS[v3];[4:v]trim=duration=3.302,fps=30,setpts=PTS-STARTPTS[v4];[5:v]fps=30,setpts=PTS-STARTPTS[v5];[v0][v1][v2][v3][v4][v5]concat=n=6:v=1:a=0[v]" \
  -map "[v]" -an -c:v libx264 -preset medium -crf 15 -pix_fmt yuv420p -movflags +faststart \
  "$FINAL_ROOT/prime-creator-silent-master.mp4"

ffmpeg -hide_banner -loglevel error -y \
  -i "$FINAL_ROOT/prime-creator-silent-master.mp4" \
  -i "$NARRATION" \
  -f lavfi -i "aevalsrc=0.10*(sin(2*PI*110*t)+0.52*sin(2*PI*164.81*t)+0.30*sin(2*PI*220*t))*(0.72+0.28*sin(2*PI*2.083333*t)):s=48000:d=20.872" \
  -filter_complex "[1:a]apad=pad_dur=0.57,volume=1.0[voice];[2:a]lowpass=f=1800,highpass=f=70,aecho=0.8:0.7:120|240:0.18|0.10,afade=t=in:st=0:d=0.6,afade=t=out:st=19.9:d=0.97,volume=0.19[music];[voice][music]amix=inputs=2:duration=longest:normalize=0,alimiter=limit=0.94[a]" \
  -map 0:v:0 -map "[a]" -c:v copy -c:a aac -b:a 256k -t 20.872 -movflags +faststart \
  "$FINAL_ROOT/prime-creator-mixed-720x1280.mp4"

ffmpeg -hide_banner -loglevel error -y \
  -i "$FINAL_ROOT/prime-creator-mixed-720x1280.mp4" \
  -i "$MOTION_ROOT/captions-overlay.mov" \
  -filter_complex "[0:v][1:v]overlay=0:0:format=auto,scale=1080:1920:flags=lanczos[v]" \
  -map "[v]" -map 0:a:0 -c:v libx264 -preset slow -crf 16 -c:a copy -movflags +faststart \
  "$FINAL_ROOT/PrimeStyleAI-creator-network-9x16.mp4"

ffmpeg -hide_banner -loglevel error -y \
  -i "$FINAL_ROOT/PrimeStyleAI-creator-network-9x16.mp4" \
  -filter_complex "[0:v]split=2[bg][fg];[bg]scale=1080:1350:force_original_aspect_ratio=increase,crop=1080:1350,gblur=sigma=34,eq=brightness=0.08:saturation=0.65[back];[fg]scale=-2:1350[front];[back][front]overlay=(W-w)/2:0[v]" \
  -map "[v]" -map '0:a?' -c:v libx264 -preset slow -crf 17 -c:a copy -movflags +faststart \
  "$FINAL_ROOT/PrimeStyleAI-creator-network-4x5.mp4"

ffmpeg -hide_banner -loglevel error -y \
  -i "$FINAL_ROOT/PrimeStyleAI-creator-network-9x16.mp4" \
  -filter_complex "[0:v]split=2[bg][fg];[bg]scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,gblur=sigma=42,eq=brightness=0.06:saturation=0.65[back];[fg]scale=-2:1080[front];[back][front]overlay=(W-w)/2:0[v]" \
  -map "[v]" -map '0:a?' -c:v libx264 -preset slow -crf 17 -c:a copy -movflags +faststart \
  "$FINAL_ROOT/PrimeStyleAI-creator-network-16x9.mp4"

printf '%s\n' \
  "$FINAL_ROOT/PrimeStyleAI-creator-network-9x16.mp4" \
  "$FINAL_ROOT/PrimeStyleAI-creator-network-4x5.mp4" \
  "$FINAL_ROOT/PrimeStyleAI-creator-network-16x9.mp4"
