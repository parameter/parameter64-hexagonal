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

/** Base palette for default hex faces (cycled by col/row). */
const HEX_CELL_BASE_SETTINGS = [
  { id: "stone", hex: "#807D74" },
  { id: "amber", hex: "#FFBF00" },
  { id: "lime", hex: "#A4ED11" },
] as const;

function hexCellBaseGradient(hex: string) {
  return `linear-gradient(160deg, color-mix(in srgb, ${hex} 88%, white 12%), color-mix(in srgb, ${hex} 72%, black 22%))`;
}

function hexCellBaseColorIndex(col: number, row: number) {
  return (col + row * 2) % HEX_CELL_BASE_SETTINGS.length;
}

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
      content: "Discgolf gamification react native mobile app",
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
        background:
          "radial-gradient(1200px 800px at 15% 0%, rgba(34,211,238,0.17), transparent 58%), radial-gradient(1000px 800px at 100% 100%, rgba(168,85,247,0.20), transparent 62%), linear-gradient(180deg, #081021 0%, #0B132A 55%, #060B17 100%)",
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
          const baseHex = HEX_CELL_BASE_SETTINGS[hexCellBaseColorIndex(cell.col, cell.row)].hex;

          return (
            <div
              key={`scroll-${cell.index}`}
              style={{
                position: "absolute",
                left: cell.left,
                top: cell.top,
                width: hexWidth,
                height: hexHeight,
                clipPath: HEX_CLIP,
                WebkitClipPath: HEX_CLIP,
                background: isActive
                  ? "linear-gradient(160deg, rgba(255,248,180,0.84), rgba(255,171,38,0.92))"
                  : hexCellBaseGradient(baseHex),
                border: isActive ? "1px solid rgba(255,241,176,0.95)" : "1px solid rgba(255,255,255,0.18)",
                boxShadow: isActive
                  ? "inset 0 0 28px rgba(255,255,255,0.30), 0 0 32px rgba(255,188,76,0.45)"
                  : "inset 0 0 20px rgba(255,255,255,0.10), 0 10px 26px rgba(0,0,0,0.30)",
                display: "grid",
                placeItems: "center",
                transform: isActive ? "scale(1.35)" : "scale(1)",
                transformOrigin: "center",
                zIndex: isActive ? 2 : 1,
                transition:
                  "transform 180ms ease, background 140ms linear, border-color 140ms linear, box-shadow 140ms linear",
              }}
            >
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
          const baseHex = HEX_CELL_BASE_SETTINGS[hexCellBaseColorIndex(cell.col, cell.row)].hex;
          const baseShadow = isActive
            ? "inset 0 0 28px rgba(255,255,255,0.36), 0 0 36px rgba(255,188,76,0.45)"
            : "inset 0 0 16px rgba(255,255,255,0.12)";
          const markerRing =
            isFixedContentMarker && !isActive
              ? ", 0 0 0 2px rgba(0, 230, 180, 0.95), 0 0 14px rgba(0, 230, 180, 0.45)"
              : isFixedContentMarker && isActive
                ? ", 0 0 0 2px rgba(255, 80, 200, 0.95), 0 0 16px rgba(255, 80, 200, 0.5)"
                : "";
          return (
            <div
              key={`fixed-${cell.index}`}
              className={isFixedContentMarker ? "hex-fixed-cell-marker" : undefined}
              data-fixed-marker={isFixedContentMarker ? key : undefined}
              style={{
                position: "absolute",
                left: cell.left,
                top: cell.top,
                width: hexWidth,
                height: hexHeight,
                clipPath: HEX_CLIP,
                WebkitClipPath: HEX_CLIP,
                background: isActive
                  ? "linear-gradient(160deg, rgba(255,248,180,0.74), rgba(255,171,38,0.84))"
                  : hexCellBaseGradient(baseHex),
                border: isActive ? "1px solid rgba(255,241,176,0.95)" : "1px solid rgba(255,255,255,0.24)",
                boxShadow: baseShadow + markerRing,
                display: "grid",
                placeItems: "center",
                transform: isActive ? "scale(1.2)" : "scale(1)",
                transformOrigin: "center",
                zIndex: isActive ? 2 : 1,
                transition:
                  "transform 180ms ease, background 140ms linear, border-color 140ms linear, box-shadow 140ms linear",
              }}
            >
              {isFixedContentMarker ? (
                <span className="hex-fixed-cell-marker-label" title={`${key} — ${markerLabel}`}>
                  <span className="hex-fixed-cell-marker-key">{key}</span>
                  <span className="hex-fixed-cell-marker-text">{markerLabel}</span>
                </span>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
