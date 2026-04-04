import { useRef, useEffect } from "react";
import styled from "styled-components";
import OpenSeadragon from "openseadragon";
import { config } from "../config";

const isPointInPolygon = (px, py, points) => {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const xi = points[i].x,
      yi = points[i].y;
    const xj = points[j].x,
      yj = points[j].y;
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
};

const Container = styled.div`
  width: 100%;
  height: 100%;
  &.hotspot-hover .openseadragon-canvas {
    cursor: pointer !important;
  }
`;

const PageViewer = ({
  page = "00",
  hotspots = [],
  onHotspotClick,
  onReady,
}) => {
  const viewerRef = useRef(null);
  const onHotspotClickRef = useRef(onHotspotClick);

  useEffect(() => {
    onHotspotClickRef.current = onHotspotClick;
  }, [onHotspotClick]);

  useEffect(() => {
    if (!viewerRef.current) return;

    const viewer = OpenSeadragon({
      element: viewerRef.current,
      tileSources: `/images/rooms/dzi/room-${page}.dzi`,
      constrainDuringPan: true,
      maxZoomLevel: config.MAX_ZOOM_LEVEL,
      visibilityRatio: 1,
      keyboardShortcuts: false,
      showNavigationControl: false,
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

    viewer.addHandler("open", () => {
      applyCoverConstraints();
      onReady?.();

      // Attach a native mousemove to the OSD canvas element directly.
      // This fires reliably regardless of OSD's synthetic event system,
      // and runs after OSD's own listeners so our cursor setting wins.
      const osdCanvas = viewer.canvas;
      if (!osdCanvas) return;

      const onMouseMove = (e) => {
        if (hotspots.length === 0) return;
        const rect = osdCanvas.getBoundingClientRect();
        const vpPt = viewer.viewport.viewerElementToViewportCoordinates(
          new OpenSeadragon.Point(e.clientX - rect.left, e.clientY - rect.top),
        );
        const over = hotspots.some(
          (hs) => !(hs.target === "17" && page === "29") && isPointInPolygon(vpPt.x, vpPt.y, hs.points),
        );
        viewerRef.current?.classList.toggle("hotspot-hover", over);
      };

      const onMouseLeave = () => {
        viewerRef.current?.classList.remove("hotspot-hover");
      };

      osdCanvas.addEventListener("mousemove", onMouseMove);
      osdCanvas.addEventListener("mouseleave", onMouseLeave);
    });

    viewer.addHandler("canvas-click", (e) => {
      if (!e.quick || hotspots.length === 0) return;
      const vpPt = viewer.viewport.viewerElementToViewportCoordinates(
        e.position,
      );
      for (const hotspot of hotspots) {
        if (isPointInPolygon(vpPt.x, vpPt.y, hotspot.points)) {
          onHotspotClickRef.current?.(hotspot.target);
          break;
        }
      }
    });

    viewer.addHandler("resize", applyCoverConstraintsDeferred);

    return () => viewer.destroy();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return <Container id="osd-viewer" ref={viewerRef} />;
};

export default PageViewer;
