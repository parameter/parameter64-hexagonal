import React from "react";

type Viewport = {
  width: number;
  height: number;
};

type HexCell = {
  index: number;
  col: number;
  row: number;
  left: number;
  top: number;
};

/** Scrolling cell content: which fixed-cell key triggers overlap, and text to show when active. */
type ScrollCellContentEntry = {
  trigger: string;
  content: string;
};

const HEX_CLIP = "polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)";

/** Same shape as HEX_CLIP; viewBox 0 0 100 100 matches percentage polygon. */
const HEX_SVG_POINTS = "25,0 75,0 100,50 75,100 25,100 0,50";

function HexClipStroke({ width, color }: { width: number, color: string }) {
  return (
    <svg
      aria-hidden
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        overflow: "visible",
        pointerEvents: "none",
      }}
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
    >
      <polygon
        points={HEX_SVG_POINTS}
        fill="none"
        stroke={color}
        strokeWidth={width}
        vectorEffect="nonScalingStroke"
      />
    </svg>
  );
}

/** Inline-only styles for fixed-cell debug labels (no external CSS). */
const FIXED_MARKER_LABEL: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: 2,
  padding: "0 6px",
  maxWidth: "92%",
  minWidth: 0,
  pointerEvents: "none",
  textAlign: "center",
  lineHeight: 1.1,
};

const FIXED_MARKER_KEY: React.CSSProperties = {
  fontSize: 25,
  fontWeight: 700,
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
  letterSpacing: "0.02em",
  color: "rgba(0, 230, 180, 0.98)",
  textShadow: "0 0 6px rgba(0, 0, 0, 0.85), 0 1px 2px rgba(0, 0, 0, 0.9)",
};

const FIXED_MARKER_TEXT: React.CSSProperties = {
  fontSize: 25,
  fontWeight: 600,
  color: "rgba(255, 255, 255, 0.92)",
  textShadow: "0 0 6px rgba(0, 0, 0, 0.85), 0 1px 2px rgba(0, 0, 0, 0.9)",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  maxWidth: "100%",
};

function useViewport(): Viewport {
  const [viewport, setViewport] = React.useState<Viewport>({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  React.useEffect(() => {
    const onResize = () => {
      setViewport({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return viewport;
}

function useScrollY() {
  const [scrollY, setScrollY] = React.useState(() => window.scrollY);

  React.useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(() => {
        setScrollY(window.scrollY);
        raf = 0;
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, []);

  return scrollY;
}

function buildCells(
  columns: number,
  rows: number,
  hexWidth: number,
  hexHeight: number,
  xOffset: number
): HexCell[] {
  return Array.from({ length: columns * rows }, (_, index) => {
    const col = index % columns;
    const row = Math.floor(index / columns);
    const left = col * hexWidth * 0.75 + xOffset;
    const top = row * hexHeight + (col % 2 ? hexHeight / 2 : 0);
    return { index, col, row, left, top };
  });
}

export default function HexagonsPage() {
  const { width, height } = useViewport();
  const scrollY = useScrollY();

  const isNarrow = width <= 1200;
  const columns = isNarrow ? 4 : 6;
  const denom = 1 + (columns - 1) * 0.75;
  // Make the grid slightly wider than the viewport so it clips symmetrically
  // when shifted by xOffset = -stepX/2 (same clip on left and right).
  const sceneWidth = width / (1 - 0.75 / denom);
  const hexWidth = sceneWidth / denom;
  const hexHeight = hexWidth * 0.8660254;
  const viewportRows = Math.ceil(height / hexHeight) + 2;
  const scrollScreens = 1;
  const totalScrollRows = Math.ceil((height * scrollScreens) / hexHeight) + 4;
  const contentHeight = totalScrollRows * hexHeight + hexHeight;
  const nearThreshold = hexHeight * 0.1;
  const containerWidthPx = width;
  // Keep clipping symmetric by centering the wider scene inside the viewport container.
  const xOffset = (containerWidthPx - sceneWidth) / 2;
  const containerLeftPx = (width - containerWidthPx) / 2;

  const cellContent: Record<string, ScrollCellContentEntry> = {
    "2-2": {
      trigger: "1-1",
      content: "Hello",
    },
    "3-12": {
      trigger: "",
      content: "World",
    },
  };

  const cellContentNarrow: Record<string, ScrollCellContentEntry> = {
    "1-2": {
      trigger: "1-1",
      content: <>Architecture <br />and backend for<br /> mobile app.</>,
    },
    "2-2": {
      trigger: "2-2",
      content: "World Narrow",
    },
    "1-4": {
      trigger: "1-2",
      content: "6666",
    },
    "2-5": {
      trigger: "2-2",
      content: "AzzzZZZZ",
    },
  };

  const activeCellContent = isNarrow ? cellContentNarrow : cellContent;

  const scrollingCells = React.useMemo(
    () => buildCells(columns, totalScrollRows, hexWidth, hexHeight, xOffset),
    [columns, totalScrollRows, hexHeight, hexWidth, xOffset]
  );

  const fixedCellContent: Record<string, string> = {
    "1-1": "Hello",
    "2-2": "World",
    "3-1": "Foo",
    "4-2": "Bar",
  };

  const fixedCellContentNarrow: Record<string, string> = {
    "1-1": "Hello Narrow 2",
    "2-2": "World Narrow 2",
    "1-2": "Foo Narrow",
    // "2-1": "Bar Narrow",
  };

  const activeFixedCellContent = isNarrow ? fixedCellContentNarrow : fixedCellContent;
 
  const fixedCells = React.useMemo(
    () => buildCells(columns, viewportRows, hexWidth, hexHeight, xOffset),
    [columns, viewportRows, hexHeight, hexWidth, xOffset]
  );

  const overlapState = React.useMemo(() => {
    const activeScrollKeys = new Set<string>();
    const activeFixedKeys = new Set<string>();

    for (const cell of scrollingCells) {
      const scrollKey = `${cell.col}-${cell.row}`;
      const entry = activeCellContent[scrollKey];
      if (!entry) continue;

      const trigger = entry.trigger.trim();
      if (!trigger) continue;

      if (!(trigger in activeFixedCellContent)) continue;

      const [fixedColStr, fixedRowStr] = trigger.split("-");
      const fixedCol = Number(fixedColStr);
      const fixedRow = Number(fixedRowStr);
      if (!Number.isFinite(fixedCol) || !Number.isFinite(fixedRow)) continue;

      const colOffset = fixedCol % 2 ? hexHeight / 2 : 0;
      const fixedTop = fixedRow * hexHeight + colOffset;
      const screenTop = cell.top - scrollY;
      const distance = Math.abs(screenTop - fixedTop);
      if (distance > nearThreshold) continue;

      activeScrollKeys.add(scrollKey);
      activeFixedKeys.add(trigger);
    }

    return { activeScrollKeys, activeFixedKeys };
  }, [activeCellContent, activeFixedCellContent, hexHeight, nearThreshold, scrollY, scrollingCells]);

  return (
    <div
      style={{
        position: "relative",
        width: containerWidthPx,
        margin: "0 auto",
        minHeight: contentHeight,
        overflowX: "hidden",
        background: "#37474F"
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          top: -hexHeight / 2,
          width: containerWidthPx,
          overflow: "clip",
        }}
      >
        {scrollingCells.map((cell) => {
          const key = `${cell.col}-${cell.row}`;
          const entry = activeCellContent[key];
          const isActive = !!entry && overlapState.activeScrollKeys.has(key);

          return (
            <div
              key={`scroll-${cell.index}`}
              className="scroll-cell"
              style={{
                position: "absolute",
                left: cell.left,
                top: cell.top,
                width: hexWidth,
                height: hexHeight,
                transform: isActive ? "scale(1.35)" : "scale(1)",
                transformOrigin: "center",
                zIndex: isActive ? 2 : 1,
              }}
            >
              <HexClipStroke
                width={1}
                color={isActive ? "rgba(255,241,176,0.95)" : "rgba(255,255,255,0.18)"}
              />
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  clipPath: HEX_CLIP,
                  WebkitClipPath: HEX_CLIP,
                  display: "grid",
                  placeItems: "center",
                }}
              >
                <div
                  aria-hidden
                  style={{
                    position: "absolute",
                    inset: 0,
                    clipPath: HEX_CLIP,
                    WebkitClipPath: HEX_CLIP,
                    background:
                      "linear-gradient(160deg, rgba(255,248,180,1), rgba(255,171,38,1))",
                    opacity: isActive ? 1 : 0,
                    transition: "opacity 0.6s ease",
                    pointerEvents: "none",
                  }}
                />
                {entry && isActive ? (
                  <div
                    style={{
                      padding: "10px 12px",
                      fontWeight: 650,
                      letterSpacing: -0.2,
                      backdropFilter: "blur(8px)",
                      textAlign: "center",
                      lineHeight: "1.2em",
                      color: "#333",
                    }}
                  >
                    {entry.content}
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      <div
        style={{
          position: "fixed",
          top: -hexHeight / 2,
          left: containerLeftPx,
          height: "100vh",
          pointerEvents: "none",
          width: containerWidthPx,
          overflow: "hidden",
        }}
      >
        {fixedCells.map((cell) => {
          const key = `${cell.col}-${cell.row}`;
          const isActive = overlapState.activeFixedKeys.has(key);
          const isFixedContentMarker = key in activeFixedCellContent;
          const markerLabel = isFixedContentMarker ? activeFixedCellContent[key] : "";
          return (
            <div
              key={`fixed-${cell.index}`}
              data-fixed-marker={isFixedContentMarker ? key : undefined}
              style={{
                position: "absolute",
                left: cell.left,
                top: cell.top,
                width: hexWidth,
                height: hexHeight,
                transform: isActive ? "scale(1.2)" : "scale(1)",
                transformOrigin: "center",
                zIndex: isActive ? 2 : 1,
                isolation: isFixedContentMarker ? "isolate" : undefined,
                transition:
                  "transform 180ms ease, background 140ms linear, box-shadow 140ms linear",
              }}
            >
              <HexClipStroke
                width={2} 
                color={isActive ? "rgba(255,241,176,0.95)" : "rgba(255,255,255,0.24)"}
              />
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  clipPath: HEX_CLIP,
                  WebkitClipPath: HEX_CLIP,
                  display: "grid",
                  placeItems: "center",
                }}
              >
                {isFixedContentMarker ? (
                  <span style={FIXED_MARKER_LABEL} title={`${key} — ${markerLabel}`}>
                    <span style={FIXED_MARKER_KEY}>{key}</span>
                    <span style={FIXED_MARKER_TEXT}>{markerLabel}</span>
                  </span>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
