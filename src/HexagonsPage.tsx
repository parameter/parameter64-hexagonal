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
  hue: number;
};

const HEX_CLIP = "polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)";

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
    const hue = 215 + ((row * 19 + col * 31) % 90);
    return { index, col, row, left, top, hue };
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
  const scrollScreens = 7;
  const totalScrollRows = Math.ceil((height * scrollScreens) / hexHeight) + 4;
  const contentHeight = totalScrollRows * hexHeight + hexHeight;
  const nearThreshold = hexHeight * 0.1;
  const containerWidthPx = width;
  // Keep clipping symmetric by centering the wider scene inside the viewport container.
  const xOffset = (containerWidthPx - sceneWidth) / 2;
  const containerLeftPx = (width - containerWidthPx) / 2;

  const cellContent = {
    "2-1": "Hello",
    "3-1": "World",
  };

  const scrollingCells = React.useMemo(
    () => buildCells(columns, totalScrollRows, hexWidth, hexHeight, xOffset),
    [columns, totalScrollRows, hexHeight, hexWidth, xOffset]
  );

  const fixedCellContent = {
    "1-0": "Hello",
    "2-1": "World",
    "3-0": "Foo",
    "4-1": "Bar",
  };

  const fixedCells = React.useMemo(
    () => buildCells(columns, viewportRows, hexWidth, hexHeight, xOffset),
    [columns, viewportRows, hexHeight, hexWidth, xOffset]
  );

  const overlapState = React.useMemo(() => {
    const activeScrollKeys = new Set<string>();
    const activeFixedKeys = new Set<string>();

    for (const cell of scrollingCells) {
      const scrollKey = `${cell.col}-${cell.row}`;
      const hasScrollContent = scrollKey in cellContent;
      if (!hasScrollContent) continue;

      const colOffset = cell.col % 2 ? hexHeight / 2 : 0;
      const screenTop = cell.top - scrollY;

      for (const fixedKey of Object.keys(fixedCellContent)) {
        const [fixedColStr, fixedRowStr] = fixedKey.split("-");
        const fixedCol = Number(fixedColStr);
        const fixedRow = Number(fixedRowStr);
        if (!Number.isFinite(fixedCol) || !Number.isFinite(fixedRow)) continue;
        if (fixedCol !== cell.col) continue;

        const fixedTop = fixedRow * hexHeight + colOffset;
        const distance = Math.abs(screenTop - fixedTop);
        if (distance > nearThreshold) continue;

        activeScrollKeys.add(scrollKey);
        activeFixedKeys.add(fixedKey);
      }
    }

    return { activeScrollKeys, activeFixedKeys };
  }, [cellContent, fixedCellContent, hexHeight, nearThreshold, scrollY, scrollingCells]);

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
      <div style={{ position: "absolute", inset: 0, width: containerWidthPx, overflow: "clip" }}>
        {scrollingCells.map((cell) => {
          const key = `${cell.col}-${cell.row}` as keyof typeof cellContent;
          const content = cellContent[key];
          const isActive = !!content && overlapState.activeScrollKeys.has(`${cell.col}-${cell.row}`);

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
                  : `linear-gradient(160deg, hsl(${cell.hue} 62% 55% / 0.9), hsl(${cell.hue + 30} 72% 36% / 0.9))`,
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
              {content && isActive ? (
                <div
                  style={{
                    padding: "10px 12px",
                    borderRadius: 12,
                    background: "rgba(0,0,0,0.22)",
                    border: "1px solid rgba(255,255,255,0.18)",
                    color: "rgba(255,255,255,0.92)",
                    fontWeight: 650,
                    letterSpacing: -0.2,
                    backdropFilter: "blur(8px)",
                  }}
                >
                  {content}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      <div
        style={{
          position: "fixed",
          top: 0,
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
          return (
            <div
              key={`fixed-${cell.index}`}
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
                  : "linear-gradient(160deg, rgba(255,255,255,0.12), rgba(255,255,255,0.04))",
                border: isActive ? "1px solid rgba(255,241,176,0.95)" : "1px solid rgba(255,255,255,0.24)",
                boxShadow: isActive
                  ? "inset 0 0 28px rgba(255,255,255,0.36), 0 0 36px rgba(255,188,76,0.45)"
                  : "inset 0 0 16px rgba(255,255,255,0.12)",
                display: "grid",
                placeItems: "center",
                transform: isActive ? "scale(1.2)" : "scale(1)",
                transformOrigin: "center",
                zIndex: isActive ? 2 : 1,
                transition:
                  "transform 180ms ease, background 140ms linear, border-color 140ms linear, box-shadow 140ms linear",
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
