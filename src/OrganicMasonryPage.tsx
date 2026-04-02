import React from "react";
import { motion } from "framer-motion";
import rubiksImage from "./images/Rubik's_Cube-3770641874.jpg";

type TileSpec = {
  id: string;
  colSpan: 1 | 2;
  rowSpan: number;
  swayDurationS: number;
  swayDelayS: number;
  bgScale: number;
  clipPath: string;
};

const TILES: TileSpec[] = [
  {
    id: "a",
    colSpan: 2,
    rowSpan: 26,
    swayDurationS: 10,
    swayDelayS: 0.2,
    bgScale: 1.08,
    clipPath: "polygon(14% 20%, 24% 8%, 42% 4%, 63% 6%, 80% 14%, 92% 28%, 96% 47%, 92% 67%, 82% 84%, 66% 95%, 47% 98%, 29% 94%, 14% 84%, 6% 68%, 3% 50%, 6% 34%)",
  },
  {
    id: "b",
    colSpan: 1,
    rowSpan: 18,
    swayDurationS: 8.5,
    swayDelayS: 0,
    bgScale: 1.1,
    clipPath: "polygon(18% 11%, 35% 3%, 56% 5%, 75% 12%, 88% 26%, 94% 45%, 92% 64%, 84% 82%, 67% 93%, 47% 97%, 28% 93%, 13% 84%, 5% 67%, 4% 48%, 8% 29%)",
  },
  {
    id: "c",
    colSpan: 1,
    rowSpan: 22,
    swayDurationS: 11,
    swayDelayS: 0.4,
    bgScale: 1.07,
    clipPath: "polygon(21% 8%, 39% 2%, 60% 4%, 78% 12%, 90% 28%, 95% 49%, 91% 70%, 81% 86%, 63% 95%, 42% 98%, 24% 93%, 11% 82%, 4% 66%, 4% 47%, 9% 27%)",
  },
  {
    id: "d",
    colSpan: 1,
    rowSpan: 16,
    swayDurationS: 7.5,
    swayDelayS: 0.15,
    bgScale: 1.12,
    clipPath: "polygon(10% 24%, 20% 9%, 38% 3%, 58% 4%, 76% 12%, 88% 27%, 94% 46%, 92% 65%, 84% 82%, 68% 94%, 49% 98%, 30% 95%, 15% 86%, 6% 70%, 4% 50%, 6% 34%)",
  },
  {
    id: "e",
    colSpan: 2,
    rowSpan: 20,
    swayDurationS: 12.5,
    swayDelayS: 0.35,
    bgScale: 1.06,
    clipPath: "polygon(13% 22%, 24% 8%, 43% 4%, 64% 5%, 81% 14%, 92% 29%, 96% 48%, 93% 67%, 84% 83%, 68% 94%, 48% 98%, 30% 95%, 15% 86%, 7% 70%, 4% 51%, 6% 34%)",
  },
  {
    id: "f",
    colSpan: 1,
    rowSpan: 28,
    swayDurationS: 9.5,
    swayDelayS: 0.1,
    bgScale: 1.08,
    clipPath: "polygon(19% 8%, 37% 2%, 58% 4%, 78% 11%, 90% 26%, 95% 46%, 92% 67%, 84% 84%, 68% 95%, 47% 99%, 27% 95%, 13% 86%, 5% 69%, 3% 49%, 7% 28%)",
  },
  {
    id: "g",
    colSpan: 1,
    rowSpan: 20,
    swayDurationS: 10.5,
    swayDelayS: 0.25,
    bgScale: 1.09,
    clipPath: "polygon(15% 18%, 27% 7%, 45% 3%, 65% 5%, 81% 14%, 92% 29%, 96% 48%, 93% 68%, 83% 84%, 66% 95%, 46% 98%, 28% 94%, 14% 84%, 6% 69%, 3% 50%, 6% 33%)",
  },
  {
    id: "h",
    colSpan: 1,
    rowSpan: 15,
    swayDurationS: 8,
    swayDelayS: 0.05,
    bgScale: 1.11,
    clipPath: "polygon(9% 23%, 18% 9%, 36% 3%, 57% 4%, 76% 12%, 89% 27%, 95% 46%, 93% 66%, 84% 83%, 68% 94%, 49% 98%, 30% 95%, 15% 86%, 7% 70%, 4% 51%, 6% 34%)",
  },
  {
    id: "i",
    colSpan: 2,
    rowSpan: 24,
    swayDurationS: 13,
    swayDelayS: 0.3,
    bgScale: 1.06,
    clipPath: "polygon(14% 19%, 25% 8%, 43% 4%, 64% 5%, 82% 14%, 93% 30%, 96% 49%, 92% 68%, 82% 83%, 66% 94%, 47% 98%, 29% 95%, 14% 86%, 6% 70%, 3% 51%, 6% 34%)",
  },
];

function useHashPath() {
  const [hash, setHash] = React.useState(() => window.location.hash || "");
  React.useEffect(() => {
    const onHashChange = () => setHash(window.location.hash || "");
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);
  return hash.replace(/^#\/?/, "");
}

export default function OrganicMasonryPage() {
  const path = useHashPath();

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(1200px 700px at 20% 10%, rgba(99,102,241,0.22) 0%, rgba(0,0,0,0) 60%), radial-gradient(900px 600px at 85% 40%, rgba(236,72,153,0.16) 0%, rgba(0,0,0,0) 55%), linear-gradient(180deg, #070A12 0%, #0B1020 60%, #070A12 100%)",
        color: "rgba(255,255,255,0.9)",
      }}
    >
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 20,
          backdropFilter: "blur(14px)",
          background: "linear-gradient(180deg, rgba(7,10,18,0.82) 0%, rgba(7,10,18,0.35) 100%)",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <div
          style={{
            maxWidth: 1180,
            margin: "0 auto",
            padding: "16px 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
            <div style={{ fontSize: 14, opacity: 0.75, letterSpacing: 0.2 }}>organic masonry</div>
            <div style={{ fontSize: 20, fontWeight: 650, letterSpacing: -0.2 }}>
              blob tiles + swaying image backgrounds
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <a
              href="#/masonry-idea"
              style={{
                padding: "10px 12px",
                borderRadius: 10,
                border: "1px solid rgba(255,255,255,0.12)",
                background: path === "masonry-idea" ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)",
                color: "rgba(255,255,255,0.9)",
              }}
            >
              Masonry
            </a>
            <a
              href="#/organic-masonry"
              style={{
                padding: "10px 12px",
                borderRadius: 10,
                border: "1px solid rgba(255,255,255,0.12)",
                background: path === "organic-masonry" ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)",
                color: "rgba(255,255,255,0.9)",
              }}
            >
              Organic
            </a>
            <a
              href="#/video"
              style={{
                padding: "10px 12px",
                borderRadius: 10,
                border: "1px solid rgba(255,255,255,0.12)",
                background: path === "video" ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)",
                color: "rgba(255,255,255,0.9)",
              }}
            >
              Video scene
            </a>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "22px 20px 42px" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gap: 16,
            gridAutoRows: 12,
          }}
        >
          {TILES.map((t, i) => (
            <div
              key={t.id}
              style={{
                position: "relative",
                overflow: "hidden",
                border: "1px solid rgba(255,255,255,0.10)",
                boxShadow: "0 22px 60px rgba(0,0,0,0.45)",
                gridColumn: `span ${t.colSpan}`,
                gridRowEnd: `span ${t.rowSpan}`,
                background: "rgba(255,255,255,0.03)",
                clipPath: t.clipPath,
                WebkitClipPath: t.clipPath,
              }}
            >
              <motion.div
                aria-hidden
                style={{
                  position: "absolute",
                  inset: -24,
                  backgroundImage: `url("${encodeURI(rubiksImage)}")`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  filter: "saturate(1.05) contrast(1.05)",
                  willChange: "transform",
                }}
                animate={{
                  x: [-10, 10, -10],
                  y: [-8, 8, -8],
                  scale: [t.bgScale, t.bgScale + 0.02, t.bgScale],
                }}
                transition={{
                  duration: t.swayDurationS,
                  delay: t.swayDelayS,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />

              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background:
                    "linear-gradient(180deg, rgba(7,10,18,0.10) 0%, rgba(7,10,18,0.40) 55%, rgba(7,10,18,0.72) 100%)",
                }}
              />

              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  padding: 16,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "flex-end",
                  gap: 6,
                }}
              >
                <div style={{ fontSize: 13, opacity: 0.75 }}>Blob {String(i + 1).padStart(2, "0")}</div>
                <div style={{ fontSize: 18, fontWeight: 650, letterSpacing: -0.2 }}>
                  {t.colSpan === 2 ? "Wide" : "Narrow"} / height {t.rowSpan}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

