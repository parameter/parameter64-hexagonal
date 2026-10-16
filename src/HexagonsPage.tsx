import React from "react";
import { createPortal } from "react-dom";
import chainoutLogo from "./images/chainout-logo-4.svg";
import bidstackerLogo from "./images/bidstacker.png";
import parameter64Logo from "./images/parameter64.png";
import mePhoto from "./images/me.webp";

/** Set to false (or open console and run `window.__HEX_DEBUG = false`) to silence. */
const HEX_DEBUG = true;

declare global {
  interface Window {
    __HEX_DEBUG?: boolean;
  }
}

function hexDebugEnabled() {
  return typeof window !== "undefined"
    ? (window.__HEX_DEBUG ?? HEX_DEBUG)
    : HEX_DEBUG;
}

function hexLog(tag: string, payload?: Record<string, unknown>) {
  if (!hexDebugEnabled()) return;
  if (payload) {
    console.log(`[hex:${tag}]`, payload);
  } else {
    console.log(`[hex:${tag}]`);
  }
}

function hexWarn(tag: string, payload?: Record<string, unknown>) {
  if (!hexDebugEnabled()) return;
  if (payload) {
    console.warn(`[hex:${tag}]`, payload);
  } else {
    console.warn(`[hex:${tag}]`);
  }
}

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
/** Fixed z-index for non-content scroll cells. */
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
        strokeWidth={0}
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

/**
 * Layout viewport width — matches html/body (excludes classic scrollbar gutter).
 * Using innerWidth made fixed/page layers 14px wider than body on Windows.
 */
function layoutViewportWidth() {
  return document.documentElement.clientWidth;
}

/**
 * Viewport size for layout/scroll geometry.
 * Guards against height-only shrinks (mobile chrome, soft keyboard, docked
 * DevTools) which would rebuild the hex section shorter and clamp scroll mid-gesture.
 */
function useViewport(): Viewport {
  const [viewport, setViewport] = React.useState<Viewport>(() => ({
    width: layoutViewportWidth(),
    height: window.innerHeight,
  }));
  const stableRef = React.useRef<Viewport>({
    width: layoutViewportWidth(),
    height: window.innerHeight,
  });

  React.useEffect(() => {
    const applyResize = () => {
      const nextWidth = layoutViewportWidth();
      const nextHeight = window.innerHeight;
      const prev = stableRef.current;
      const widthChanged = Math.abs(nextWidth - prev.width) >= 1;
      const heightDelta = nextHeight - prev.height;

      // Height-only shrink: keep the larger layout height so scroll range / fixed
      // grid math stay stable. Width changes (rotate, real window resize) resync.
      if (!widthChanged && heightDelta < 0) {
        hexWarn("viewport:guard-height-shrink", {
          keptHeight: prev.height,
          rawHeight: nextHeight,
          delta: Math.round(heightDelta),
          scrollY: Math.round(window.scrollY),
          maxScrollY: document.documentElement.scrollHeight - window.innerHeight,
        });
        return;
      }

      // Ignore tiny height-only jitter (URL bar / browser chrome).
      if (!widthChanged && Math.abs(heightDelta) > 0 && Math.abs(heightDelta) < 48) {
        hexLog("viewport:guard-height-jitter", {
          keptHeight: prev.height,
          rawHeight: nextHeight,
          delta: Math.round(heightDelta),
        });
        return;
      }

      const next: Viewport = {
        width: nextWidth,
        height: widthChanged ? nextHeight : Math.max(prev.height, nextHeight),
      };

      if (next.width === prev.width && next.height === prev.height) return;

      stableRef.current = next;
      setViewport(next);
      hexLog("viewport:update", {
        ...next,
        rawHeight: nextHeight,
        widthChanged,
      });
    };

    window.addEventListener("resize", applyResize);
    return () => window.removeEventListener("resize", applyResize);
  }, []);

  return viewport;
}

function useScrollY() {
  const [scrollY, setScrollY] = React.useState(() => window.scrollY);

  React.useEffect(() => {
    let raf = 0;
    let lastNativeY = window.scrollY;
    let lastStateY = window.scrollY;
    let scrollEventCount = 0;
    let rafSkipCount = 0;
    let lastLogAt = 0;
    let lastNativeChangeAt = performance.now();
    let lastStateChangeAt = performance.now();

    hexLog("scroll:listen", {
      initialScrollY: window.scrollY,
      maxScrollY: document.documentElement.scrollHeight - window.innerHeight,
      bodyOverflow: getComputedStyle(document.body).overflow,
      htmlOverflow: getComputedStyle(document.documentElement).overflow,
    });

    const onScroll = () => {
      scrollEventCount += 1;
      const nativeY = window.scrollY;
      const now = performance.now();

      if (nativeY !== lastNativeY) {
        lastNativeChangeAt = now;
        lastNativeY = nativeY;
      }

      // Detect "scroll stuck": events may still fire (or wheel may fire) but Y doesn't move.
      if (now - lastLogAt > 250) {
        lastLogAt = now;
        hexLog("scroll:event", {
          nativeY,
          stateY: lastStateY,
          deltaFromState: nativeY - lastStateY,
          scrollEventCount,
          rafPending: raf !== 0,
          rafSkipCount,
          msSinceNativeChange: Math.round(now - lastNativeChangeAt),
          msSinceStateChange: Math.round(now - lastStateChangeAt),
          maxScrollY: document.documentElement.scrollHeight - window.innerHeight,
        });
      }

      if (raf) {
        rafSkipCount += 1;
        return;
      }

      raf = window.requestAnimationFrame(() => {
        const nextY = window.scrollY;
        if (nextY !== lastStateY) {
          lastStateY = nextY;
          lastStateChangeAt = performance.now();
          hexLog("scroll:state", {
            scrollY: nextY,
            scrollEventCount,
            rafSkipCount,
          });
        } else {
          hexWarn("scroll:raf-no-change", {
            scrollY: nextY,
            scrollEventCount,
            rafSkipCount,
            maxScrollY: document.documentElement.scrollHeight - window.innerHeight,
          });
        }
        setScrollY(nextY);
        raf = 0;
      });
    };

    const onWheel = (e: WheelEvent) => {
      if (!hexDebugEnabled()) return;
      // Only log when native scrollY hasn't moved recently — likely "stuck".
      const now = performance.now();
      if (now - lastNativeChangeAt < 400) return;
      hexWarn("scroll:wheel-while-stuck", {
        deltaY: e.deltaY,
        nativeY: window.scrollY,
        stateY: lastStateY,
        maxScrollY: document.documentElement.scrollHeight - window.innerHeight,
        defaultPrevented: e.defaultPrevented,
        cancelable: e.cancelable,
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("wheel", onWheel, { passive: true });
    return () => {
      hexLog("scroll:unlisten", { scrollEventCount, rafSkipCount, lastStateY });
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("wheel", onWheel);
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

/** Content is authored for 4 columns. Wide screens add an even number of side
 *  columns so odd/even stagger (and thus the honeycomb) matches narrow. */
const CONTENT_COLUMNS = 4;
/** Cap the colored/content hex band at this width on large viewports. */
const CONTENT_MAX_WIDTH = 900;
/** Empty columns on each side when wide. Must be even to preserve stagger parity. */
const WIDE_SIDE_COLUMNS = 2;
/** Viewport width (px) at/above which hexes keep full size. Laptop-ish. */
const HEX_SCALE_BREAKPOINT = 1400;
/** Hex size multiplier when width is below HEX_SCALE_BREAKPOINT (1 = full size). */
const HEX_SCALE_BELOW_BREAKPOINT = 0.7;

function shiftColKey(key: string, colShift: number): string {
  if (colShift === 0) return key;
  const [colStr, rowStr] = key.split("-");
  const col = Number(colStr);
  const row = Number(rowStr);
  if (!Number.isFinite(col) || !Number.isFinite(row)) return key;
  return `${col + colShift}-${row}`;
}

function shiftKeyRecord<T>(record: Record<string, T>, colShift: number): Record<string, T> {
  if (colShift === 0) return record;
  const out: Record<string, T> = {};
  for (const [key, value] of Object.entries(record)) {
    out[shiftColKey(key, colShift)] = value;
  }
  return out;
}

function shiftCellContent(
  record: Record<string, ScrollCellContentEntry>,
  colShift: number
): Record<string, ScrollCellContentEntry> {
  if (colShift === 0) return record;
  const out: Record<string, ScrollCellContentEntry> = {};
  for (const [key, entry] of Object.entries(record)) {
    const trigger = entry.trigger.trim();
    out[shiftColKey(key, colShift)] = {
      ...entry,
      trigger: trigger ? shiftColKey(trigger, colShift) : entry.trigger,
    };
  }
  return out;
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

  const isNarrow = width <= CONTENT_MAX_WIDTH;
  // Hex size from the 4-col content band, capped at CONTENT_MAX_WIDTH so wide
  // viewports keep the same content scale as a 900px layout. Side columns fill out.
  const sideColumns = isNarrow ? 0 : WIDE_SIDE_COLUMNS;
  const columns = CONTENT_COLUMNS + sideColumns * 2;
  const colShift = sideColumns;
  const contentLayoutWidth = Math.min(width, CONTENT_MAX_WIDTH);
  const contentDenom = 1 + (CONTENT_COLUMNS - 1) * 0.75;
  const contentSceneWidth = contentLayoutWidth / (1 - 0.75 / contentDenom);
  const hexScale =
    width < HEX_SCALE_BREAKPOINT ? HEX_SCALE_BELOW_BREAKPOINT : 1;
  const hexWidth = (contentSceneWidth / contentDenom) * hexScale;
  const hexHeight = hexWidth * 0.8660254;
  const denom = 1 + (columns - 1) * 0.75;
  const sceneWidth = hexWidth * denom;
  const viewportRows = Math.ceil(height / hexHeight) + 2;
  const scrollScreens = 1;
  // At least 5 rows so authored cells through row 4 (e.g. "2-4") always print,
  // even on short viewports where height-based count would drop them.
  const totalScrollRows = Math.max(
    5,
    Math.ceil((height * scrollScreens) / hexHeight) + 2
  );
  const contentHeight = totalScrollRows * hexHeight + hexHeight;
  const nearThreshold = hexHeight * 0.25;
  /** How far from the trigger the tint starts rising (scroll-driven 0 → 1). */
  const activationFadeRange = height * 0.75;
  const containerWidthPx = width;
  // Center the (possibly wider) scene; side columns clip outside the viewport.
  const xOffset = (containerWidthPx - sceneWidth) / 2;
  const containerLeftPx = (width - containerWidthPx) / 2;

  // #2773F5
  // #A4ED11
  // #FFBF00

  /** Author content in mobile (4-col) coordinates; shifted for desktop. */
  const cellContentBase: Record<string, ScrollCellContentEntry> = {
    "1-2": {
      trigger: "1-1",
      inactiveContent: <img style={{ width: "100%", maxWidth: "75%" }} width="auto" height="auto" src={bidstackerLogo} alt="Bidstacker AB" />,
      content: <>
        <img style={{ width: "100%", maxWidth: "75%" }} width="auto" height="auto" src={bidstackerLogo} alt="Bidstacker AB" />
        <div style={{ color: "#453300" }} className="hex-active-only">
          Architecture <br />and backend for<br /> mobile app.
        </div>
      </>,
      background: "#FFBF00",
    },
    "2-2": {
      trigger: "2-2",
      inactiveContent: (
        <img
          className="hex-img-luminosity"
          style={{ width: "100%", maxWidth: "25%" }}
          width="auto"
          height="auto"
          src={chainoutLogo}
          alt="ChainOut App"
        />
      ),
      content: (
        <>
          <img
            className="hex-img-luminosity"
            style={{ width: "100%", maxWidth: "25%" }}
            width="auto"
            height="auto"
            src={chainoutLogo}
            alt="ChainOut App"
          />
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
      inactiveContent: <img style={{ width: "100%", maxWidth: "70%" }} style={{ width: "100%", maxWidth: "75%" }} width="auto" height="auto" src={parameter64Logo} alt="Parameter64, Pär Henriksson" />,
      content: <>
      <img style={{ width: "100%", maxWidth: "70%" }} width="auto" height="auto" src={parameter64Logo} alt="Parameter64, Pär Henriksson" />
      <div style={{ color: "#385105" }} className="hex-active-only">
        web, applications and   
        <br />
        everything since 2010
      </div>
      </>,
      background: "#A4ED11",
    },
  };

  const emptyCellsBase: Record<string, true> = {
    "1-1": true,
    "2-3": true,
  };

  const fixedCellContentBase: Record<string, string> = {
    "1-1": "Hello Narrow 2",
    "2-2": "World Narrow 2",
    "1-2": "Foo Narrow",
  };

  const activeCellContent = shiftCellContent(cellContentBase, colShift);
  const emptyCells = shiftKeyRecord(emptyCellsBase, colShift);
  const activeFixedCellContent = shiftKeyRecord(fixedCellContentBase, colShift);

  const scrollingCells = React.useMemo(
    () => buildCells(columns, totalScrollRows, hexWidth, hexHeight, xOffset),
    [columns, totalScrollRows, hexHeight, hexWidth, xOffset]
  );

  const fixedCells = React.useMemo(
    () => buildCells(columns, viewportRows, hexWidth, hexHeight, xOffset),
    [columns, viewportRows, hexHeight, hexWidth, xOffset]
  );

  const overlapState = React.useMemo(() => {
    const activeScrollKeys = new Set<string>();
    const activeFixedKeys = new Set<string>();
    const candidates: Array<{
      scrollKey: string;
      trigger: string;
      screenTop: number;
      fixedTop: number;
      distance: number;
      near: boolean;
    }> = [];

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
      const near = distance <= nearThreshold;
      candidates.push({
        scrollKey,
        trigger,
        screenTop,
        fixedTop,
        distance,
        near,
      });
      if (!near) continue;

      activeScrollKeys.add(scrollKey);
      activeFixedKeys.add(trigger);
    }

    return { activeScrollKeys, activeFixedKeys, candidates };
  }, [activeCellContent, activeFixedCellContent, hexHeight, nearThreshold, scrollY, scrollingCells]);

  const prevOverlapSigRef = React.useRef("");
  React.useEffect(() => {
    const activeScroll = [...overlapState.activeScrollKeys].sort().join("|") || "(none)";
    const activeFixed = [...overlapState.activeFixedKeys].sort().join("|") || "(none)";
    const sig = `${activeScroll}::${activeFixed}`;
    if (sig === prevOverlapSigRef.current) return;
    prevOverlapSigRef.current = sig;

    const nearest = [...overlapState.candidates]
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 6)
      .map((c) => ({
        key: c.scrollKey,
        trigger: c.trigger,
        dist: Math.round(c.distance),
        near: c.near,
        screenTop: Math.round(c.screenTop),
        fixedTop: Math.round(c.fixedTop),
      }));

    hexLog("overlap:change", {
      scrollY: Math.round(scrollY),
      nearThreshold: Math.round(nearThreshold),
      activeScroll,
      activeFixed,
      nearest,
    });
  }, [nearThreshold, overlapState, scrollY]);

  // Heartbeat: if scrollY moves but nothing is near, still periodically sample distances
  // so we can see whether effects "should" be firing.
  const lastHeartbeatRef = React.useRef(0);
  React.useEffect(() => {
    if (!hexDebugEnabled()) return;
    const now = performance.now();
    if (now - lastHeartbeatRef.current < 500) return;
    lastHeartbeatRef.current = now;
    if (overlapState.activeScrollKeys.size > 0) return;

    const nearest = [...overlapState.candidates]
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 3);
    if (nearest.length === 0) return;

    hexLog("overlap:idle-nearest", {
      scrollY: Math.round(scrollY),
      nearest: nearest.map((c) => ({
        key: c.scrollKey,
        trigger: c.trigger,
        dist: Math.round(c.distance),
        threshold: Math.round(nearThreshold),
        shortfall: Math.round(c.distance - nearThreshold),
      })),
    });
  }, [nearThreshold, overlapState, scrollY]);

  const [scrollCellZByKey, setScrollCellZByKey] = React.useState<Record<string, number>>({});
  const prevActiveNarrowKeysRef = React.useRef<Set<string>>(new Set());
  /** Global counter so the most recently activated narrow cell always stacks on top. */
  const nextScrollCellZRef = React.useRef(SCROLL_CELL_Z_BASE - 1);

  const activeNarrowScrollKeySig = React.useMemo(
    () =>
      [...overlapState.activeScrollKeys]
        .filter((k) => k in activeCellContent)
        .sort()
        .join("|"),
    [activeCellContent, overlapState.activeScrollKeys]
  );

  React.useEffect(() => {
    const current = new Set(
      activeNarrowScrollKeySig ? activeNarrowScrollKeySig.split("|") : []
    );
    const prev = prevActiveNarrowKeysRef.current;
    const newlyActive: string[] = [];
    const newlyInactive: string[] = [];

    for (const key of current) {
      if (!prev.has(key)) newlyActive.push(key);
    }
    for (const key of prev) {
      if (!current.has(key)) newlyInactive.push(key);
    }

    prevActiveNarrowKeysRef.current = current;

    if (newlyActive.length === 0 && newlyInactive.length === 0) return;

    hexLog("z:transition", {
      newlyActive,
      newlyInactive,
      nextZBefore: nextScrollCellZRef.current,
      currentActive: [...current],
    });

    if (newlyActive.length === 0) return;

    setScrollCellZByKey((prior) => {
      const next = { ...prior };
      for (const key of newlyActive) {
        nextScrollCellZRef.current += 1;
        next[key] = nextScrollCellZRef.current;
      }
      hexLog("z:assign", { assigned: newlyActive.map((k) => [k, next[k]]), map: next });
      return next;
    });
  }, [activeNarrowScrollKeySig]);

  const anyHexActive = overlapState.activeScrollKeys.size > 0;

  // One-shot geometry dump when layout inputs change (resize / breakpoint).
  React.useEffect(() => {
    hexLog("layout", {
      width,
      height,
      isNarrow,
      sideColumns,
      colShift,
      columns,
      hexWidth: Math.round(hexWidth),
      hexHeight: Math.round(hexHeight),
      viewportRows,
      totalScrollRows,
      contentHeight: Math.round(contentHeight),
      hexSectionWouldBe: Math.round(totalScrollRows * hexHeight + hexHeight / 2),
      nearThreshold: Math.round(nearThreshold),
      activationFadeRange: Math.round(activationFadeRange),
      contentKeys: Object.keys(activeCellContent),
      fixedKeys: Object.keys(activeFixedCellContent),
      maxScrollY: document.documentElement.scrollHeight - window.innerHeight,
      docScrollHeight: document.documentElement.scrollHeight,
    });
    // Intentionally omit content object identities — they are recreated each render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    activationFadeRange,
    columns,
    contentHeight,
    height,
    hexHeight,
    hexWidth,
    isNarrow,
    nearThreshold,
    totalScrollRows,
    viewportRows,
    width,
  ]);

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

  // Portal keeps the backdrop on the viewport. A parent with overflow-x (even
  // "hidden") can turn position:fixed into a scroll-relative containing block,
  // which is what made this layer drift upward while scrolling.
  const fixedHexLayer =
    typeof document !== "undefined"
      ? createPortal(
          <div
            aria-hidden
            data-hex-fixed-layer
            style={{
              position: "fixed",
              top: -hexHeight,
              left: containerLeftPx,
              // Use guarded layout height — not 100vh — so mobile chrome / DevTools
              // cannot retarget the fixed box independently of our geometry.
              height: height + hexHeight,
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
                    zIndex: 2,
                    isolation: isFixedContentMarker ? "isolate" : undefined,
                    transition: "background 140ms linear, box-shadow 140ms linear",
                  }}
                >
                  {
                    <HexClipStroke
                      width={1}
                      color={anyHexActive ? "#2e2e2e" : "#313131"}
                    />
                  }
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
          </div>,
          document.body
        )
      : null;

  return (
    <div
      style={{
        position: "relative",
        width: containerWidthPx,
        margin: "0 auto",
        // Do not set overflow-x here: it makes descendants' position:fixed
        // scroll with this box in Chromium. Horizontal clip lives on body.
        background: "#2B2B2B",
      }}
    >
      {fixedHexLayer}
      {typeof document !== "undefined"
        ? createPortal(
            <div
              style={{
                position: "fixed",
                top: "12px",
                left: "15px",
                zIndex: 100,
                padding: "10px 12px",
                pointerEvents: "none",
              }}
            >
              <h1
                className="c64-font"
                style={{
                  color: "#ffffff",
                  fontSize: "24px",
                  fontWeight: 600,
                  letterSpacing: -0.2,
                  margin: 0,
                }}
              >
                Par Henriksson
              </h1>
              <p
                className="mono-font"
                style={{
                  color: "rgba(255, 255, 255, 0.8)",
                  fontSize: "17px",
                  fontWeight: 400,
                  margin: "4px 0 0",
                }}
              >
                programmer, developer, builder
              </p>
            </div>,
            document.body
          )
        : null}
      {typeof document !== "undefined"
        ? createPortal(
            <div
              className="mono-font open-chip"
              style={{
                position: "fixed",
                top: "13px",
                right: "24px",
                zIndex: 100,
                pointerEvents: "none",
                userSelect: "none",
              }}
            >
              <b>
                O<span>P</span>E<span>N</span>
              </b>
            </div>,
            document.body
          )
        : null}

      <section
        style={{
          position: "relative",
          height: hexSectionHeight,
          zIndex: 10,
          overflow: "hidden"
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
                  // Content cells bump z on activation so the newest active hex stacks on top.
                  zIndex: key in activeCellContent
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
                  {entry ? (
                    <h2
                      className={`hex-headline${isActive ? " is-active" : ""}`}
                    >
                      <div className="hex-inactive-content">
                        {entry.inactiveContent}
                      </div>
                      <div className="hex-active-content">
                        {entry.content}
                      </div>
                    </h2>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section
        aria-label="Next"
        style={{
          position: "relative",
          zIndex: 8,
          // Tuck up to the even-column flats so the next section fills the zig-zag notches.
          marginTop: evenBottomY - hexSectionHeight,
          paddingBottom: "160px",
          minHeight: height,
          background:
            "linear-gradient(to bottom, rgba(0, 0, 0, 0.72) 0%, rgba(0, 0, 0, 0.28) 35%, transparent 70%)",
        }}
      >

        <div className="text-stuff-section">

          <div className="text-stuff-section-inner">

            <p className="portfolio-headline">
              I build applications for the web and mobiles, on my own and sometimes together with a client with an idea we take to market.
            </p>

            <h4 className="portfolio-subtitle italic orange-color">Here are some recent things</h4>

            <ul className="portfolio-list">
              <li>
                <section>
                  <a href="https://bidstacker.com" target="_blank" rel="noopener noreferrer">Bidstacker AB</a>
                  <p>Tech lead, builder/developer, founder and owner.</p>
                  <p>We verified and then built the product we are now optimizing for different types of users.</p>
                </section>
              </li>
              <li>
                <section>
                  <a href="https://chainout.app" target="_blank" rel="noopener noreferrer">ChainOut App</a>
                  <p>Tech lead and full stack developer.</p>
                  <p>With a finished app we are now bootstrapping it with sponsors, disgolf course managers and players.</p>
                </section>
              </li>
              <li>
                <section>
                  <a href="https://idyo.ai" target="_blank" rel="noopener noreferrer">IDYO AI</a>
                  <p>Developer.</p>
                  <p>Just an ordinary website job.</p>
                </section>
              </li>
            </ul>

            <p className="portfolio-p">
              I'd love to hear what you are doing.
            </p>
            <p className="portfolio-p">
              <a href="mailto:parameter64@proton.me">parameter64@proton.me</a>
            </p>

          </div>
        
        </div>
      
      </section>
      
    </div>
  );
}
