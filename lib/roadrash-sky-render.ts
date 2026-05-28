/** Procedural sky + parallax hills (Road-Rash-master layered BACKGROUND pattern) */

export type SkyWeather = 'sunny' | 'rainy' | 'foggy' | 'thunderstorm' | 'heatwave' | 'dust_storm';

export function drawRoadRashSkyscape(
  ctx: CanvasRenderingContext2D,
  width: number,
  skyLine: number,
  weather: SkyWeather,
  trackId: string,
  position: number,
  segmentCurve: number
) {
  const speedFactor = Math.min(1, position / 5000);
  const skyOffset = (position * 0.001 + segmentCurve * speedFactor * 0.02) % 1;
  const hillOffset = (position * 0.002 + segmentCurve * speedFactor * 0.04) % 1;
  const treeOffset = (position * 0.003 + segmentCurve * speedFactor * 0.06) % 1;

  const skyGrad = ctx.createLinearGradient(0, 0, 0, skyLine);
  if (trackId === 'goa') {
    skyGrad.addColorStop(0, '#7c2d12');
    skyGrad.addColorStop(0.35, '#ea580c');
    skyGrad.addColorStop(1, '#fde68a');
  } else if (trackId === 'delhi') {
    skyGrad.addColorStop(0, '#1e293b');
    skyGrad.addColorStop(0.5, '#64748b');
    skyGrad.addColorStop(1, '#94a3b8');
  } else if (weather === 'rainy' || weather === 'thunderstorm') {
    skyGrad.addColorStop(0, '#0f172a');
    skyGrad.addColorStop(1, '#475569');
  } else if (weather === 'foggy' || weather === 'dust_storm') {
    skyGrad.addColorStop(0, '#334155');
    skyGrad.addColorStop(1, '#94a3b8');
  } else if (weather === 'heatwave') {
    skyGrad.addColorStop(0, '#ea580c');
    skyGrad.addColorStop(1, '#fde68a');
  } else {
    skyGrad.addColorStop(0, '#0c1929');
    skyGrad.addColorStop(0.45, '#1e3a5f');
    skyGrad.addColorStop(1, '#38bdf8');
  }
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, width, skyLine);

  const hillScroll = position * 0.00015 + hillOffset * 200;
  const hillLayers = [
    { color: '#0f3d22', amp: 28, freq: 0.006, offset: 0, parallax: 1 },
    { color: '#14532d', amp: 22, freq: 0.009, offset: 1.2, parallax: 1.4 },
    { color: '#166534', amp: 16, freq: 0.014, offset: 2.4, parallax: 1.8 },
  ];

  for (const layer of hillLayers) {
    ctx.fillStyle = layer.color;
    ctx.beginPath();
    ctx.moveTo(0, skyLine);
    for (let hx = 0; hx <= width; hx += 6) {
      const hy =
        skyLine * 0.55 +
        Math.sin(hx * layer.freq + hillScroll * layer.parallax + layer.offset) * layer.amp +
        Math.sin(hx * layer.freq * 2.3 + layer.offset + skyOffset * 40) * (layer.amp * 0.35);
      ctx.lineTo(hx, hy);
    }
    ctx.lineTo(width, skyLine);
    ctx.closePath();
    ctx.fill();
  }

  // Tree silhouettes (Road-Rash-master TREES layer — simplified)
  ctx.fillStyle = '#052e16';
  const treeBaseY = skyLine * 0.52;
  for (let tx = -20; tx < width + 40; tx += 48) {
    const ox = ((tx + treeOffset * width * 0.3) % (width + 80)) - 40;
    const th = 14 + (ox % 17);
    ctx.beginPath();
    ctx.moveTo(ox, treeBaseY);
    ctx.lineTo(ox - 8, treeBaseY);
    ctx.lineTo(ox, treeBaseY - th * 2.2);
    ctx.lineTo(ox + 8, treeBaseY);
    ctx.closePath();
    ctx.fill();
  }

  if (trackId !== 'delhi' || weather !== 'foggy') {
    const sunX = width * (trackId === 'goa' ? 0.65 : 0.78);
    const sunY = skyLine * (trackId === 'goa' ? 0.38 : 0.32);
    const sunGlow = ctx.createRadialGradient(sunX, sunY, 4, sunX, sunY, 90);
    sunGlow.addColorStop(0, 'rgba(251, 191, 36, 0.95)');
    sunGlow.addColorStop(0.4, 'rgba(249, 115, 22, 0.35)');
    sunGlow.addColorStop(1, 'rgba(249, 115, 22, 0)');
    ctx.fillStyle = sunGlow;
    ctx.fillRect(sunX - 100, sunY - 100, 200, 200);
  }
}
