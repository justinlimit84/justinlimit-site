#!/usr/bin/env bash
# Render the three Ch 7 clips on the GPU and encode small web copies (H.264, faststart, no audio) + posters.
set -euo pipefail
cd "$(dirname "$0")"
QUALITY="${1:-}"   # pass -l for a fast draft
~/manim/venv/bin/manimgl ch7_clips.py WorkArea EnergySwap SameWork -w $QUALITY
OUT=../public/clips
declare -A POSTER_AT=([WorkArea]=7 [EnergySwap]=14.5 [SameWork]=12)
mkdir -p "$OUT"
for s in WorkArea EnergySwap SameWork; do
  src=$(ls -t videos/$s.mp4 2>/dev/null | head -1)
  slug=$(echo "$s" | sed -E 's/([a-z])([A-Z])/\1-\2/g' | tr 'A-Z' 'a-z')
  ffmpeg -y -loglevel error -i "$src" -an -c:v libx264 -preset slow -crf 26 -pix_fmt yuv420p -vf "scale=1280:-2" -movflags +faststart "$OUT/$slug.mp4"
  ffmpeg -y -loglevel error -ss "${POSTER_AT[$s]}" -i "$src" -frames:v 1 -vf "scale=1280:-2" -q:v 4 "$OUT/$slug.jpg"
  echo "$OUT/$slug.mp4  $(du -h "$OUT/$slug.mp4" | cut -f1)"
done
