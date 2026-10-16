import React from "react";
import VideoSphereScene from "./VideoSphereScene";
import MasonryIdeaPage from "./MasonryIdeaPage";
import OrganicMasonryPage from "./OrganicMasonryPage";
import HexagonsPage from "./HexagonsPage";

function getPath() {
  return window.location.pathname.replace(/^\//, "").replace(/\/$/, "");
}

export default function App() {
  const [path, setPath] = React.useState(() => getPath());

  React.useEffect(() => {
    // Migrate old hash routes (#/video → /video)
    const hashRoute = window.location.hash.replace(/^#\/?/, "");
    if (hashRoute) {
      window.history.replaceState(null, "", `/${hashRoute}`);
      setPath(hashRoute);
    }

    const onPopState = () => setPath(getPath());
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  if (path === "masonry-idea") return <MasonryIdeaPage />;
  if (path === "organic-masonry") return <OrganicMasonryPage />;
  if (path === "video") return <VideoSphereScene />;
  return <HexagonsPage />;
}
