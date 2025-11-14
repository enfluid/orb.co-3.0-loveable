import ColorThief from "colorthief";

interface ColorPalette {
  primary: string;
  secondary: string;
  tertiary: string;
  quaternary: string;
}

function rgbToHex(r: number, g: number, b: number): string {
  return "#" + [r, g, b].map((x) => {
    const hex = x.toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  }).join("").toUpperCase();
}

function getRGBValues(color: number[]): [number, number, number] {
  return [color[0], color[1], color[2]];
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return [h * 360, s * 100, l * 100];
}

function getColorDistance(color: number[]): number {
  const [r, g, b] = color;
  const [h, s, l] = rgbToHsl(r, g, b);

  // Prefer blues (180-240 degrees) and greens (60-180 degrees)
  // Deprioritize grays/browns with low saturation
  if (s < 20) return 1000; // Deprioritize low saturation

  // Blue preference: 180-240
  if (h >= 180 && h <= 240) return 0;
  // Green preference: 60-180
  if (h >= 60 && h <= 180) return 1;
  // Other colors
  return 2;
}

export async function extractColorsFromImage(
  imageUrl: string
): Promise<ColorPalette> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = imageUrl;

    img.onload = () => {
      try {
        const colorThief = new ColorThief();

        // Get a larger palette to choose from
        const palette = colorThief.getPalette(img, 8);

        if (!palette || palette.length === 0) {
          // Fallback colors if extraction fails
          resolve({
            primary: "#0088cc",
            secondary: "#00d4ff",
            tertiary: "#66dd88",
            quaternary: "#88ff44",
          });
          return;
        }

        // Sort colors by hue preference (blues first, then greens)
        const sortedPalette = palette
          .map((color: number[]) => ({
            hex: rgbToHex(...getRGBValues(color)),
            priority: getColorDistance(color),
          }))
          .sort((a, b) => a.priority - b.priority)
          .slice(0, 4);

        // Ensure we have 4 colors, use fallback if needed
        const colors = sortedPalette.length >= 4
          ? sortedPalette.slice(0, 4)
          : [
              { hex: "#0088cc" },
              { hex: "#00d4ff" },
              { hex: "#66dd88" },
              { hex: "#88ff44" },
            ];

        resolve({
          primary: colors[0].hex,
          secondary: colors[1].hex,
          tertiary: colors[2].hex,
          quaternary: colors[3].hex,
        });
      } catch (error) {
        console.error("Error extracting colors:", error);
        // Fallback colors
        resolve({
          primary: "#0088cc",
          secondary: "#00d4ff",
          tertiary: "#66dd88",
          quaternary: "#88ff44",
        });
      }
    };

    img.onerror = () => {
      console.error("Error loading image for color extraction");
      // Fallback colors
      resolve({
        primary: "#0088cc",
        secondary: "#00d4ff",
        tertiary: "#66dd88",
        quaternary: "#88ff44",
      });
    };
  });
}
