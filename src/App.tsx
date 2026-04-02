import React from "react";
import VideoSphereScene from "./VideoSphereScene";
import MasonryIdeaPage from "./MasonryIdeaPage";
import OrganicMasonryPage from "./OrganicMasonryPage";
import HexagonsPage from "./HexagonsPage";

export default function App() {
  const [hash, setHash] = React.useState(() => window.location.hash || "#/video");

  React.useEffect(() => {
    const onHashChange = () => setHash(window.location.hash || "#/video");
    window.addEventListener("hashchange", onHashChange);
    if (!window.location.hash) window.location.hash = "#/video";
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const path = hash.replace(/^#\/?/, "");

  if (path === "masonry-idea") return <MasonryIdeaPage />;
  if (path === "organic-masonry") return <OrganicMasonryPage />;
  if (path === "hexagons") return <HexagonsPage />;
  return <VideoSphereScene />;
}
