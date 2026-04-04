import { useState, useEffect, useCallback, useRef } from "react";
import styled from "styled-components";
import PageViewer from "./components/PageViewer";
import NarrativeOverlay from "./components/NarrativeOverlay";
import TransitionOverlay from "./components/TransitionOverlay";
import HotspotEditor from "./components/HotspotEditor";
import { hotspots as hotspotData } from "./data/hotspots";
import { narrative as narrativeData } from "./data/narrative";
import { config } from "./config";

// Transition phase state machine:
//
//   idle ──(hotspot click)──► transit ──(user click, transitReady)──► revealing ──(900ms)──► idle
//
// Overlay:      transit = fading in (80% black + travel text)
//               revealing = fading out
//               idle = gone
//
// ViewerWrapper opacity is driven by direct DOM manipulation (not React state) so
// that transition-duration and opacity changes happen in separate browser frames,
// which is required for CSS transitions to fire reliably.
// transitReady:  false until new OSD is open; gates the overlay click
// Narrative:     hides on hotspot click, shows when phase returns to idle

const Container = styled.div`
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  &::after {
    content: "";
    position: fixed;
    inset: 0;
    background-color: rgb(232, 211, 144);
    mix-blend-mode: color-burn;
    pointer-events: none;
    z-index: 300;
  }
`;

// Opacity and transition are set directly on this element via a ref so that
// changing the transition-duration and the opacity value always happen in
// separate browser frames, which is required for CSS transitions to fire.
const ViewerWrapper = styled.div`
  width: 100%;
  height: 100%;
`;

const getNarrative = (page) => narrativeData.find((n) => n.page === page);

// Fades a DOM element to a target opacity using a given duration.
// Setting transition-duration and then forcing a reflow before changing opacity
// ensures the browser always animates the change correctly, regardless of whether
// both values changed in the same React render cycle.
const fadeElement = (el, toOpacity, durationMs) => {
  if (!el) return;
  el.style.transition = `opacity ${durationMs}ms ease`;
  el.getBoundingClientRect(); // force reflow — commits the new transition-duration
  el.style.opacity = toOpacity;
};

const App = () => {
  const [currentPage, setCurrentPage] = useState("00");
  const [phase, setPhase] = useState("idle"); // 'idle' | 'transit' | 'revealing'
  const [transitReady, setTransitReady] = useState(false);
  const [narrativeVisible, setNarrativeVisible] = useState(true);
  const [travelExit, setTravelExit] = useState("");
  const [travelEnter, setTravelEnter] = useState("");

  const timerRef = useRef(null);
  const viewerWrapperRef = useRef(null);

  const clearTimer = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  };

  useEffect(() => () => clearTimer(), []);

  if (config.EDITOR_MODE) return <HotspotEditor />;

  const pageHotspots =
    hotspotData.find((p) => p.page === currentPage)?.hotspots ?? [];

  // Called when the user clicks a door hotspot.
  const handleHotspotClick = useCallback(
    (target) => {
      if (phase !== "idle") return;

      setTravelExit(getNarrative(currentPage)?.travel?.exit ?? "");
      setTravelEnter(getNarrative(target)?.travel?.enter ?? "");
      setNarrativeVisible(false);
      setTransitReady(false);
      setPhase("transit"); // overlay + text begin fading in simultaneously

      // Fade out the current room
      fadeElement(viewerWrapperRef.current, 0, config.TRANSITION_ROOM_MS);

      // Swap the page halfway through the fade-out so the new OSD starts loading
      // while the old room is still fading — new room fades in as soon as OSD is ready.
      clearTimer();
      timerRef.current = setTimeout(
        () => setCurrentPage(target),
        Math.round(config.TRANSITION_ROOM_MS * 0.5),
      );
    },
    [phase, currentPage],
  );

  // Called by the new PageViewer's OSD when its tileset is open and rendered.
  // Fades the new room in immediately — no artificial hold.
  const handleOSDReady = () => {
    clearTimer();
    fadeElement(viewerWrapperRef.current, 1, config.TRANSITION_ROOM_MS);
    setTransitReady(true);
  };

  // Called when the user clicks the overlay after the new room has loaded.
  const handleTransitClick = useCallback(() => {
    if (phase !== "transit" || !transitReady) return;

    setPhase("revealing");     // overlay fades out (800ms CSS)
    setNarrativeVisible(true); // narrative fades in simultaneously (1200ms CSS)

    clearTimer();
    // Wait for the overlay to finish fading out before returning to idle
    timerRef.current = setTimeout(() => setPhase("idle"), config.TRANSITION_OVERLAY_MS + 100);
  }, [phase, transitReady]);

  return (
    <Container>
      <NarrativeOverlay
        page={currentPage}
        isVisible={narrativeVisible}
        onDismiss={() => setNarrativeVisible(false)}
      />
      <ViewerWrapper ref={viewerWrapperRef}>
        <PageViewer
          key={`page-${currentPage}`}
          page={currentPage}
          hotspots={pageHotspots}
          onHotspotClick={handleHotspotClick}
          onReady={handleOSDReady}
        />
      </ViewerWrapper>
      <TransitionOverlay
        phase={phase}
        transitReady={transitReady}
        exitText={travelExit}
        enterText={travelEnter}
        onTransitClick={handleTransitClick}
      />
    </Container>
  );
};

export default App;
