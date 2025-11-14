interface CarouselDotsProps {
  totalItems: number;
  currentIndex: number;
  onDotClick: (index: number) => void;
  // Fractional index for smooth dragging animation
  floatIndex?: number;
  // Disable transitions while actively dragging
  isDragging?: boolean;
  // Number of neighbors on each side to show (2 => 5 dots visible)
  visibleRadius?: number;
}

export function CarouselDots({
  totalItems,
  currentIndex,
  onDotClick,
  floatIndex,
  isDragging = false,
  visibleRadius = 2,
}: CarouselDotsProps) {
  if (totalItems <= 1) return null;

  const slotPx = 14; // space allocated per dot in the track
  const viewportSlots = visibleRadius * 2 + 1; // e.g. 5
  const viewportPx = slotPx * viewportSlots;

  const idx = typeof floatIndex === "number" ? floatIndex : currentIndex;

  // Translate track so the current (fractional) dot is centered in the viewport
  const trackTranslate = -(idx * slotPx - (viewportPx - slotPx) / 2);

  const styleFor = (i: number): React.CSSProperties => {
    const d = Math.abs(i - idx);
    // Size and opacity falloff based on distance
    let opacity = 0;
    let size = 6; // px
    if (d < 0.5) {
      opacity = 1;
      size = 10;
    } else if (d < 1.5) {
      opacity = 0.75;
      size = 8;
    } else if (d < 2.5) {
      opacity = 0.45;
      size = 6;
    } else {
      opacity = 0; // completely transparent beyond visible radius
      size = 6;
    }
    return {
      width: size,
      height: size,
      opacity,
      transition: isDragging
        ? undefined
        : "opacity 150ms ease, width 150ms ease, height 150ms ease",
    };
  };

  return (
    <div className="flex justify-center items-center pt-2">
      <div className="overflow-hidden" style={{ width: viewportPx }}>
        <div
          className="flex items-center"
          style={{
            width: totalItems * slotPx,
            transform: `translateX(${trackTranslate}px)`,
            transition: isDragging ? undefined : "transform 200ms ease",
            gap: 0,
          }}
        >
          {Array.from({ length: totalItems }).map((_, i) => (
            <button
              key={i}
              onClick={() => onDotClick(i)}
              aria-label={`Go to image ${i + 1}`}
              className="rounded-full bg-gray-700"
              style={{
                ...styleFor(i),
                marginLeft: i === 0 ? 0 : slotPx - 6, // keep consistent spacing independent of size
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
