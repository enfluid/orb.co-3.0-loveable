interface IconProps {
  name: string;
  style?:
    | "regular"
    | "solid"
    | "light"
    | "thin"
    | "brands"
    | "duotone"
    | "duotone-light"
    | "duotone-regular"
    | "duotone-thin"
    | "sharp-duotone-light"
    | "sharp-duotone-regular"
    | "sharp-duotone-solid"
    | "sharp-duotone-thin"
    | "sharp-light"
    | "sharp-regular"
    | "sharp-solid"
    | "sharp-thin";
  size?: number;
  color?: string;
  className?: string;
  alt?: string;
  maskScale?: number;
}

const colorMap: Record<string, string> = {
  "text-sky-600": "#0284c7",
  "text-yellow-500": "#eab308",
  "text-gray-500": "#6b7280",
  "text-red-600": "#dc2626",
  "text-white": "#ffffff",
  "text-gray-900": "#111827",
};

export function Icon({
  name,
  style = "solid",
  size = 24,
  color = "text-sky-600",
  className = "",
  alt = "",
  maskScale = 1,
}: IconProps & { maskScale?: number }) {
  const hexColor = colorMap[color] || color;
  const iconUrl = `/icons/fa/svgs/${style}/${name}.svg`;
  const maskSizeValue =
    maskScale === 1 ? "contain" : `${maskScale * 100}% ${maskScale * 100}%`;

  return (
    <div
      style={{
        width: size,
        height: size,
        backgroundColor: hexColor,
        maskImage: `url('${iconUrl}')`,
        WebkitMaskImage: `url('${iconUrl}')`,
        maskSize: maskSizeValue,
        WebkitMaskSize: maskSizeValue,
        maskRepeat: "no-repeat",
        WebkitMaskRepeat: "no-repeat",
        maskPosition: "center",
        WebkitMaskPosition: "center",
        display: "inline-block",
      }}
      className={className}
      title={alt}
      role="img"
      aria-label={alt}
    />
  );
}
