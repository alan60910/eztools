#!/usr/bin/env bash
# Spike S1: emoji rendering test - UTF-8 source, no BOM
# Candidates: keyboard(VS16) / laptop / tree / seedling / herb / robot

echo "=== Width markers (emoji + ASCII marker) ==="
echo "⌨️|end  <- Keyboard(VS16) U+2328,FE0F"
echo "💻|end  <- Laptop U+1F4BB"
echo "🌳|end  <- Tree U+1F333"
echo "🌱|end  <- Seedling U+1F331"
echo "🌿|end  <- Herb U+1F33F"
echo "🤖|end  <- Robot U+1F916"

echo ""
echo "=== Alignment line (mixed emoji + ascii columns) ==="
echo "[AAA]🤖[BBB]🌳[CCC]⌨️[DDD]"

echo ""
echo "=== Parse-fidelity: hex bytes (UTF-8) per candidate ==="
for pair in "Keyboard(VS16)|U+2328,FE0F:⌨️" "Laptop|U+1F4BB:💻" "Tree|U+1F333:🌳" "Seedling|U+1F331:🌱" "Herb|U+1F33F:🌿" "Robot|U+1F916:🤖"; do
  label="${pair%%:*}"
  glyph="${pair#*:}"
  hexbytes=$(printf '%s' "$glyph" | od -A n -t x1 | tr -s ' ')
  echo "${label} =>${hexbytes}"
done
