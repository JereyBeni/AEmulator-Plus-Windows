// Genera una paleta tonal estilo Material You a partir de un color base.
// Aproximación en HSL: no es el algoritmo HCT de Material, pero da tonos coherentes.
function hexToHsl(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
  }
  return [h, s * 100, l * 100];
}

export function materialPalette(seedHex: string, dark: boolean): Record<string, string> {
  const [h, s] = hexToHsl(seedHex);
  const sat = Math.max(s, 28);
  const p = (l: number, sMul = 1) => `hsl(${h.toFixed(0)} ${(sat * sMul).toFixed(0)}% ${l}%)`;
  if (dark) {
    return {
      "--primary": p(80),
      "--on-primary": p(20),
      "--primary-container": p(30),
      "--on-primary-container": p(90),
      "--secondary-container": p(25, 0.6),
      "--on-secondary-container": p(90, 0.6),
      "--surface": p(10, 0.2),
      "--surface-high": p(17, 0.2),
      "--on-surface": p(90, 0.1),
      "--on-surface-variant": p(75, 0.2),
      "--outline": p(55, 0.3),
      "--error": "hsl(355 70% 72%)",
    };
  }
  return {
    "--primary": p(40),
    "--on-primary": p(100),
    "--primary-container": p(90),
    "--on-primary-container": p(10),
    "--secondary-container": p(90, 0.4),
    "--on-secondary-container": p(10, 0.4),
    "--surface": p(98, 0.1),
    "--surface-high": p(94, 0.1),
    "--on-surface": p(10, 0.1),
    "--on-surface-variant": p(30, 0.2),
    "--outline": p(50, 0.3),
    "--error": "hsl(355 65% 42%)",
  };
}
