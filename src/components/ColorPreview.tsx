// DeLab 色块预览 - React component

interface RgbColor { r: number; g: number; b: number; }

function normalizeColor(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function isLightColor(color: string): boolean {
  const rgb = parseColorToRgb(color);
  if (!rgb) return false;
  const r = rgb.r / 255, g = rgb.g / 255, b = rgb.b / 255;
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) > 0.9;
}

function parseColorToRgb(color: string): RgbColor | null {
  const hexMatch = color.match(/^#([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})/);
  if (hexMatch) {
    return { r: parseInt(hexMatch[1], 16), g: parseInt(hexMatch[2], 16), b: parseInt(hexMatch[3], 16) };
  }
  const rgbMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (rgbMatch) {
    return { r: parseInt(rgbMatch[1]), g: parseInt(rgbMatch[2]), b: parseInt(rgbMatch[3]) };
  }
  return null;
}

interface ColorPreviewProps {
  colorValue: string;
}

export function ColorPreview({ colorValue }: ColorPreviewProps) {
  const normalized = normalizeColor(colorValue);
  const style: React.CSSProperties = {
    display: 'inline-block',
    width: 18,
    height: 18,
    borderRadius: 3,
    marginRight: 6,
    verticalAlign: 'middle',
    flexShrink: 0,
    backgroundColor: normalized,
  };
  if (isLightColor(normalized)) {
    style.border = '1px solid var(--delab-border, #23252a)';
  }
  return <span style={style} title={colorValue} />;
}
