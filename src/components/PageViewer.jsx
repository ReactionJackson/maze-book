import { useRef, useEffect } from "react";
import styled from "styled-components";
import OpenSeadragon from "openseadragon";

const Container = styled.div`
  width: 100%;
  height: 100%;
`;

const PageViewer = ({ page = 1 }) => {
  const viewerRef = useRef(null);

  useEffect(() => {
    if (!viewerRef.current) return;

    const viewer = OpenSeadragon({
      element: viewerRef.current,
      tileSources: `/images/room-${page.toString().padStart(2, "0")}.dzi`,
      constrainDuringPan: true,
      maxZoomLevel: 4,
      showNavigationControl: false,
      visibilityRatio: 1,
      gestureSettingsMouse: { clickToZoom: false },
      gestureSettingsTouch: { clickToZoom: false },
    });

    const applyCoverConstraints = () => {
      const vp = viewer.viewport;
      const item = viewer.world.getItemAt(0);
      if (!item) return;
      const container = vp.getContainerSize();
      const imgSize = item.getContentSize();
      const vpAR = container.x / container.y;
      const imgAR = imgSize.x / imgSize.y;
      const coverFactor = Math.max(imgAR, vpAR) / Math.min(imgAR, vpAR);
      vp.minZoomLevel = vp.getHomeZoom() * coverFactor;
      vp.applyConstraints(true);
    };

    const applyCoverConstraintsDeferred = () =>
      setTimeout(applyCoverConstraints, 0);

    viewer.addHandler("open", applyCoverConstraints);
    viewer.addHandler("resize", applyCoverConstraintsDeferred);

    return () => viewer.destroy();
  }, []);

  return <Container id="osd-viewer" ref={viewerRef} />;
};

export default PageViewer;
