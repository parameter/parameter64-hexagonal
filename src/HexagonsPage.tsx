import React from "react";
import chainoutLogo from "./images/chainout-logo-4.svg";
import bidstackerLogo from "./images/bidstacker.png";

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
  content: React.ReactNode;
  /** Shown when the cell is not active (e.g. logo only). Falls back to nothing. */
  inactiveContent?: React.ReactNode;
  /** Hex fill color; scroll-fades from 0 → 1 as the cell approaches its trigger. */
  background?: string;
};

const HEX_CLIP = "polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)";

/** First z-index assigned to a narrow cell; global counter increases from here. */
const SCROLL_CELL_Z_BASE = 40;
/** Fixed z-index for cellContent (wide) cells — no iteration. */
const SCROLL_CELL_Z_WIDE = 3;
const SCROLL_CELL_Z_DEFAULT = 2;

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

function HexClip({ width, color }: { width: number, color: string }) {
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
        stroke={"#242424"}
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

/**
 * Bottom silhouette of a flat-top hex row in section coordinates
 * (cell layer is shifted up by hexHeight, so flat bottom Y === cell.top).
 * Matches HEX_CLIP: 25%/75% flats, 0%/100% mid vertices.
 */
function hexRowBottomEdge(
  columns: number,
  hexWidth: number,
  hexHeight: number,
  xOffset: number,
  row: number,
  containerWidth: number
): { x: number; y: number }[] {
  const evenBottomY = row * hexHeight;
  const pts: { x: number; y: number }[] = [{ x: 0, y: evenBottomY }];

  for (let c = 0; c < columns; c++) {
    const left = c * hexWidth * 0.75 + xOffset;
    const cellTop = row * hexHeight + (c % 2 ? hexHeight / 2 : 0);
    const bottomY = cellTop;
    const midY = cellTop - hexHeight / 2;

    if (c % 2 === 0) {
      pts.push({ x: left + hexWidth * 0.25, y: bottomY });
      pts.push({ x: left + hexWidth * 0.75, y: bottomY });
    } else {
      // Odd columns hang lower — full tooth: slant, flat, slant.
      pts.push({ x: left, y: midY });
      pts.push({ x: left + hexWidth * 0.25, y: bottomY });
      pts.push({ x: left + hexWidth * 0.75, y: bottomY });
      pts.push({ x: left + hexWidth, y: midY });
    }
  }

  pts.push({ x: containerWidth, y: evenBottomY });
  return pts;
}

function polygonClip(points: { x: number; y: number }[]): string {
  return `polygon(${points.map((p) => `${p.x.toFixed(2)}px ${p.y.toFixed(2)}px`).join(", ")})`;
}

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

function smoothstep01(n: number) {
  const t = clamp01(n);
  return t * t * (3 - 2 * t);
}

/**
 * Scroll-driven opacity toward a fixed trigger: 0 when far away (appearing),
 * 1 inside the activation band (nearThreshold).
 */
function activationApproachOpacity(
  screenTop: number,
  fixedTop: number,
  nearThreshold: number,
  fadeRange: number
): number {
  const dist = Math.abs(screenTop - fixedTop);
  if (dist <= nearThreshold) return 1;
  if (fadeRange <= nearThreshold) return 0;
  return smoothstep01(1 - (dist - nearThreshold) / (fadeRange - nearThreshold));
}

export default function HexagonsPage() {
  const { width, height } = useViewport();
  const scrollY = useScrollY();

  const isNarrow = width <= 900;
  const columns = isNarrow ? 4 : 6;
  const denom = 1 + (columns - 1) * 0.75;
  // Make the grid slightly wider than the viewport so it clips symmetrically
  // when shifted by xOffset = -stepX/2 (same clip on left and right).
  const sceneWidth = width / (1 - 0.75 / denom);
  const hexWidth = sceneWidth / denom;
  const hexHeight = hexWidth * 0.8660254;
  const viewportRows = Math.ceil(height / hexHeight) + 2;
  const scrollScreens = 1;
  const totalScrollRows = Math.ceil((height * scrollScreens) / hexHeight) + 2;
  const contentHeight = totalScrollRows * hexHeight + hexHeight;
  const nearThreshold = hexHeight * 0.25;
  /** How far from the trigger the tint starts rising (scroll-driven 0 → 1). */
  const activationFadeRange = height * 0.75;
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

  // #2773F5

  // #A4ED11

  // #FFBF00

  const cellContentNarrow: Record<string, ScrollCellContentEntry> = {
    "1-2": {
      trigger: "1-1",
      inactiveContent: <img width="auto" height="40" src={bidstackerLogo} alt="Bidstacker AB" />,
      content: <>
        <img width="auto" height="40" src={bidstackerLogo} alt="Bidstacker AB" />
        <div className="hex-active-only">
          Architecture <br />and backend for<br /> mobile app.
        </div>
      </>,
      background: "#FFBF00",
    },
    "2-2": {
      trigger: "2-2",
      inactiveContent: <img width="70" height="70" src={chainoutLogo} alt="ChainOut App" />,
      content: (
        <>
          <img width="70" height="70" src={chainoutLogo} alt="ChainOut App" />
          <div className="hex-active-only">
            ChainOut
            <br />
            gamified discgolf
            <br />
            scoring app
          </div>
        </>
      ),
      background: "#2773F5",
    },
    "2-4": {
      trigger: "2-2",
      inactiveContent: <img width="auto" height="40" src={bidstackerLogo} alt="Bidstacker AB" />,
      content: <img src={chainoutLogo} alt="ChainOut App" />,
      background: "#A4ED11",
    },
    "2-5": {
      trigger: "2-2",
      inactiveContent: <img width="auto" height="40" src={bidstackerLogo} alt="Bidstacker AB" />,
      content: "AzzzZZZZ",
      background: "#FF8826",
    },
  };

  const emptyCells: Record<string, true> = {
    "1-1": true,
    "2-3": true,
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

  const [scrollCellZByKey, setScrollCellZByKey] = React.useState<Record<string, number>>({});
  const prevActiveNarrowKeysRef = React.useRef<Set<string>>(new Set());
  /** Global counter so the most recently activated narrow cell always stacks on top. */
  const nextScrollCellZRef = React.useRef(SCROLL_CELL_Z_BASE - 1);

  const activeNarrowScrollKeySig = React.useMemo(
    () =>
      [...overlapState.activeScrollKeys]
        .filter((k) => k in cellContentNarrow)
        .sort()
        .join("|"),
    [overlapState.activeScrollKeys]
  );

  React.useEffect(() => {
    const current = new Set(
      activeNarrowScrollKeySig ? activeNarrowScrollKeySig.split("|") : []
    );
    const prev = prevActiveNarrowKeysRef.current;
    const newlyActive: string[] = [];

    for (const key of current) {
      if (!prev.has(key)) newlyActive.push(key);
    }

    prevActiveNarrowKeysRef.current = current;

    if (newlyActive.length === 0) return;

    setScrollCellZByKey((prior) => {
      const next = { ...prior };
      for (const key of newlyActive) {
        nextScrollCellZRef.current += 1;
        next[key] = nextScrollCellZRef.current;
      }
      return next;
    });
  }, [activeNarrowScrollKeySig]);

  const anyHexActive = overlapState.activeScrollKeys.size > 0;

  // Clip along the last row's hex bottoms (same shape as HEX_CLIP).
  const clipRow = totalScrollRows - 1;
  const bottomEdge = hexRowBottomEdge(
    columns,
    hexWidth,
    hexHeight,
    xOffset,
    clipRow,
    containerWidthPx
  );
  const oddBottomY = clipRow * hexHeight + hexHeight / 2;
  const evenBottomY = clipRow * hexHeight;
  const hexSectionHeight = oddBottomY;
  // Clip coords match the section box (y = 0 at section top).
  const hexSectionClip = polygonClip([
    { x: 0, y: 0 },
    { x: containerWidthPx, y: 0 },
    ...[...bottomEdge].reverse(),
  ]);

  return (
    <div
      style={{
        position: "relative",
        width: containerWidthPx,
        margin: "0 auto",
        overflowX: "hidden",
        background: "#2B2B2B",
      }}
    >
      <h1 className="c64-font" style={{ position: "fixed", top: 0, left: "15px", zIndex: 100, color: "#ffffff", fontSize: "24px", fontWeight: 600, letterSpacing: -0.2, padding: "10px 12px" }}>
        Par Henriksson
      </h1>

      <section
        style={{
          position: "relative",
          height: hexSectionHeight,
          zIndex: 10,
        }}
      >
        {/* Grey hex backdrop with zig-zag bottom; skips emptyCells so those stay true holes. */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            clipPath: hexSectionClip,
            WebkitClipPath: hexSectionClip,
            zIndex: 0,
          }}
        >
          <div
            style={{
              position: "absolute",
              left: 0,
              width: containerWidthPx,
              top: -hexHeight,
              height: contentHeight + hexHeight,
            }}
          >
            {scrollingCells.map((cell) => {
              const key = `${cell.col}-${cell.row}`;
              if (key in emptyCells) return null;
              return (
                <div
                  key={`bg-${cell.index}`}
                  style={{
                    position: "absolute",
                    left: cell.left,
                    top: cell.top,
                    width: hexWidth,
                    height: hexHeight,
                    clipPath: HEX_CLIP,
                    WebkitClipPath: HEX_CLIP,
                    background: "#2B2B2B",
                  }}
                />
              );
            })}
          </div>
        </div>
        <div
          style={{
            position: "absolute",
            left: 0,
            width: containerWidthPx,
            top: -hexHeight,
            height: contentHeight + hexHeight,
            zIndex: 2,
          }}
        >
          {scrollingCells.map((cell) => {
            const key = `${cell.col}-${cell.row}`;
            const entry = activeCellContent[key];
            const isEmptyCell = key in emptyCells;
            const isActive = !!entry && overlapState.activeScrollKeys.has(key);
            const hasTint = Boolean(entry?.background);
            // Same coordinate space as overlapState (cell.top - scrollY vs fixedTop).
            let tintOpacity = 1;
            if (hasTint && entry) {
              const trigger = entry.trigger.trim();
              if (trigger && trigger in activeFixedCellContent) {
                const [fixedColStr, fixedRowStr] = trigger.split("-");
                const fixedCol = Number(fixedColStr);
                const fixedRow = Number(fixedRowStr);
                if (Number.isFinite(fixedCol) && Number.isFinite(fixedRow)) {
                  const colOffset = fixedCol % 2 ? hexHeight / 2 : 0;
                  const fixedTop = fixedRow * hexHeight + colOffset;
                  const approachTop = cell.top - scrollY;
                  tintOpacity = activationApproachOpacity(
                    approachTop,
                    fixedTop,
                    nearThreshold,
                    activationFadeRange
                  );
                } else {
                  tintOpacity = 0;
                }
              } else {
                tintOpacity = 0;
              }
            }

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
                  transform: isActive ? "scale(1.2)" : "scale(1)",
                  transformOrigin: "center",
                  // Z-index iteration only for cellContentNarrow keys; wide content uses a fixed layer.
                  zIndex: key in cellContentNarrow
                    ? (scrollCellZByKey[key] ?? SCROLL_CELL_Z_BASE)
                    : entry
                      ? SCROLL_CELL_Z_WIDE
                      : SCROLL_CELL_Z_DEFAULT,
                }}
              >
                <HexClip
                  width={2}
                  color={isActive ? "#333333" : "#333333"}
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
                  {/* Colored tint only — grey base comes from the backdrop (emptyCells = holes). */}
                  {hasTint && !isEmptyCell ? (
                    <div
                      aria-hidden
                      style={{
                        position: "absolute",
                        inset: 0,
                        clipPath: HEX_CLIP,
                        WebkitClipPath: HEX_CLIP,
                        background: entry!.background,
                        opacity: tintOpacity,
                        pointerEvents: "none",
                      }}
                    />
                  ) : null}
                  {entry && (isActive) ? (
                    <h2
                      className="hex-headline"
                      style={{
                        position: "relative",
                        zIndex: 1,
                        margin: 0,
                        padding: "10px 12px",
                        fontWeight: 650,
                        letterSpacing: -0.2,
                        textAlign: "center",
                        fontSize: "1em",
                        lineHeight: "1.3em",
                        color: "#ffffff",
                        mixBlendMode: "luminosity"
                      }}
                    >
                      {entry.content}
                    </h2>
                  ) : null}
                  {entry && !isActive ? (
                    <h2
                      className="hex-headline"
                      style={{
                        position: "relative",
                        zIndex: 1,
                        margin: 0,
                        padding: "10px 12px",
                        fontWeight: 650,
                        letterSpacing: -0.2,
                        textAlign: "center",
                        fontSize: "1em",
                        lineHeight: "1.3em",
                        color: "#ffffff",
                        mixBlendMode: "luminosity"
                      }}
                    >
                      {entry.inactiveContent}
                    </h2>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <div
        style={{
          position: "fixed",
          top: -hexHeight,
          left: containerLeftPx,
          height: "calc(100vh + " + (hexHeight) + "px)",
          pointerEvents: "none",
          width: containerWidthPx,
          overflow: "hidden",
          zIndex: 5,
          background: "#363636",
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
                transform: "scale(1)",
                zIndex: 2,
                isolation: isFixedContentMarker ? "isolate" : undefined,
                transition: "background 140ms linear, box-shadow 140ms linear",
              }}
            >
              {!anyHexActive ? (
                <HexClipStroke
                  width={1}
                  color={isActive ? "#2e2e2e" : "#2e2e2e"}
                />
              ) : null}
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
                    <span style={FIXED_MARKER_KEY}></span>
                    <span style={FIXED_MARKER_TEXT}></span>
                  </span>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      <section
        aria-label="Next"
        style={{
          position: "relative",
          zIndex: 8,
          // Tuck up to the even-column flats so the next section fills the zig-zag notches.
          marginTop: evenBottomY - hexSectionHeight,
          minHeight: height
        }}
      >

        <div className="text-stuff-section">

          <h1 className="portfolio-headline">Hi, Par here. I've been building things for the web since 2010.</h1>
        
        
        </div>
      
      </section>
      
    </div>
  );
}
