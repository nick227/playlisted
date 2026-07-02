export function drawWaveformPeaks(
  context: CanvasRenderingContext2D,
  peaks: number[],
  width: number,
  height: number,
) {
  const maxPeak = Math.max(...peaks, 0.001);
  const barWidth = width / peaks.length;
  const centerY = height / 2;

  context.fillStyle = "rgba(255,255,255,0.32)";
  for (let index = 0; index < peaks.length; index += 1) {
    const normalized = peaks[index]! / maxPeak;
    const barHeight = Math.max(2, normalized * (height - 8));
    const x = index * barWidth;
    context.fillRect(x, centerY - barHeight / 2, Math.max(1, barWidth - 0.5), barHeight);
  }
}
