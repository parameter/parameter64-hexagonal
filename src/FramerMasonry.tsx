import React from "react";
import { motion } from "framer-motion";
import TileScene from "./TileScene";
import rubikImage from "./images/Rubik's_Cube-3770641874.jpg";

const items = [
  {
    id: 1,
    title: "Abstract",
    color: "#60a5fa",
    height: 240,
    imageUrl: rubikImage,
  },
  {
    id: 2,
    title: "Modern",
    color: "#f87171",
    height: 460,
    imageUrl: rubikImage,
  },
  {
    id: 3,
    title: "Brutalist",
    color: "#fbbf24",
    height: 320,
    imageUrl: rubikImage,
  },
  {
    id: 4,
    title: "Minimal",
    color: "#34d399",
    height: 380,
    imageUrl: rubikImage,
  },
  {
    id: 5,
    title: "Surreal",
    color: "#818cf8",
    height: 280,
    imageUrl: rubikImage,
  },
  {
    id: 6,
    title: "Geometric",
    color: "#fb923c",
    height: 520,
    imageUrl: rubikImage,
  },
  {
    id: 7,
    title: "Kinetic",
    color: "#22c55e",
    height: 260,
    imageUrl: rubikImage,
  },
  {
    id: 8,
    title: "Monochrome",
    color: "#0ea5e9",
    height: 420,
    imageUrl: rubikImage,
  },
  {
    id: 9,
    title: "Neo",
    color: "#a78bfa",
    height: 300,
    imageUrl: rubikImage,
  },
  {
    id: 10,
    title: "Noir",
    color: "#111827",
    height: 360,
    imageUrl: rubikImage,
  },
  {
    id: 11,
    title: "Pop",
    color: "#ec4899",
    height: 240,
    imageUrl: rubikImage,
  },
  {
    id: 12,
    title: "Chromatic",
    color: "#f97316",
    height: 480,
    imageUrl: rubikImage,
  },
];

export default function FramerMasonry() {
  const [hoveredId, setHoveredId] = React.useState<number | null>(null);
  const tileHeight = 260;

  return (
    <div style={{ padding: "44px 24px", backgroundColor: "#f8fafc", minHeight: "100vh" }}>
      <div
        style={{
          maxWidth: "1440px",
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          gap: "20px",
          alignItems: "stretch",
        }}
      >
        {items.map((item) => {
          const isHovered = hoveredId === item.id;
          const height = tileHeight;

          return (
          <motion.div
            key={item.id}
            style={{
              backgroundColor: item.color,
              height,
              borderRadius: "24px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              position: "relative",
              overflow: "hidden",
              boxShadow: "0 10px 30px rgba(0,0,0,0.18)",
            }}
            layout
            onHoverStart={() => setHoveredId(item.id)}
            onHoverEnd={() => setHoveredId((cur) => (cur === item.id ? null : cur))}
            animate={{
              zIndex: isHovered ? 20 : 1,
              scale: isHovered ? 1.03 : 1,
              boxShadow:
                isHovered
                  ? "0 30px 80px rgba(0,0,0,0.30)"
                  : "0 10px 30px rgba(0,0,0,0.18)",
            }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: "spring", stiffness: 600, damping: 35, mass: 0.8 }}
          >
            <TileScene color={item.color} imageUrl={item.imageUrl} active={isHovered} />

            <div
              style={{
                position: "absolute",
                inset: 0,
                background:
                  "linear-gradient(180deg, rgba(0,0,0,0.10) 0%, rgba(0,0,0,0.55) 100%)",
                opacity: isHovered ? 0.35 : 0.5,
                transition: "opacity 200ms ease",
                pointerEvents: "none",
              }}
            />

          </motion.div>
          );
        })}
      </div>
    </div>
  );
}
