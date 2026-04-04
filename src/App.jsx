import { useState, useEffect, useCallback, useRef } from "react";
import styled from "styled-components";
import PageViewer from "./components/PageViewer";
import NarrativePanel from "./components/NarrativePanel";
import TransitionOverlay from "./components/TransitionOverlay";
import HotspotEditor from "./components/HotspotEditor";
import { hotspots as hotspotData } from "./data/hotspots";
import { narrative as narrativeData } from "./data/narrative";
import { config } from "./config";

// Transition phase state machine:
//
//   idle ──(hotspot click, panel open)──► closing ──(PANEL_MS)──► transit ──(user click)──► revealing ──(OVERLAY_MS)──► idle
//   idle ──(hotspot click, panel closed)──────────────────────► transit ──(user click)──► revealing ──(OVERLAY_MS)──► idle
//
// Panel auto-opens when phase returns to idle.
// Toggle button manually opens/closes the panel during idle only.

const Container = styled.div`
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: row;
`;

// Fills remaining horizontal space beside the panel; OSD lives inside this.
const ViewerWrapper = styled.div`
  flex: 1;
  height: 100%;
`;

// Always-on color-burn tint sitting above the OSD and transition overlay,
// but below the narrative panel. Position: fixed keeps it completely outside
// the ViewerWrapper opacity tree so it never fades during transitions.
const ColorBurnOverlay = styled.div`
  position: fixed;
  inset: 0;
  background-color: rgb(232, 211, 144);
  mix-blend-mode: color-burn;
  pointer-events: none;
  z-index: 250;
`;

// Tab button that sits at the right edge of the panel, sliding with it.
const ToggleButton = styled.button`
  position: fixed;
  top: 50%;
  left: ${({ $panelOpen }) => ($panelOpen ? config.PANEL_WIDTH : 0)}px;
  transform: translateY(-50%);
  transition: left ${config.TRANSITION_PANEL_MS}ms ease;
  z-index: 300;
  border-radius: 0 30px 30px 0;
  width: 30px;
  height: 72px;
  background: #000;
  color: #fcf7e2;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  font-size: 18px;
  letter-spacing: 0;
  cursor: pointer;
  opacity: ${({ $disabled }) => ($disabled ? 0 : 1)};
  transition:
    left ${config.TRANSITION_PANEL_MS}ms ease,
    opacity 300ms ease;
  pointer-events: ${({ $disabled }) => ($disabled ? "none" : "auto")};
  span {
    transform: ${({ $panelOpen }) => (!$panelOpen ? "rotate(180deg)" : "none")};
    transition: transform ${config.TRANSITION_PANEL_MS}ms ease;
    cursor: pointer;
  }
`;

const getNarrative = (page) => narrativeData.find((n) => n.page === page);

// Fades a DOM element's opacity, committing the new transition-duration via a
// forced reflow so the CSS animation always fires correctly.
const fadeElement = (el, toOpacity, durationMs) => {
  if (!el) return;
  el.style.transition = `opacity ${durationMs}ms ease`;
  el.getBoundingClientRect();
  el.style.opacity = toOpacity;
};

const App = () => {
  const [currentPage, setCurrentPage] = useState("00");
  const [phase, setPhase] = useState("idle"); // 'idle' | 'closing' | 'transit' | 'revealing'
  const [panelOpen, setPanelOpen] = useState(false);
  const [transitReady, setTransitReady] = useState(false);
  const [travelExit, setTravelExit] = useState("");
  const [travelEnter, setTravelEnter] = useState("");
  const [tvMode, setTvMode] = useState(false);
  const [path, setPath] = useState([]); // rooms visited; empty until room 01 entered

  const timerRef = useRef(null);
  const viewerWrapperRef = useRef(null);
  // True when the room we're navigating INTO has been visited before on this run.
  const isRevisitRef = useRef(false);

  const clearTimer = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  };

  useEffect(() => () => clearTimer(), []);

  // "T" key toggles TV mode (off by default).
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === "t" || e.key === "T") setTvMode((v) => !v);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Panel starts closed; animate open after 1 s for a cinematic reveal on load.
  useEffect(() => {
    const id = setTimeout(() => setPanelOpen(true), 1000);
    return () => clearTimeout(id);
  }, []);

  if (config.EDITOR_MODE) return <HotspotEditor />;

  const pageHotspots =
    hotspotData.find((p) => p.page === currentPage)?.hotspots ?? [];

  // Kicks off the room fade and page swap — called either immediately (panel
  // already closed) or after the panel has finished sliding out.
  const beginTransit = (target) => {
    const fromPage = currentPage; // capture before any async delay
    setPhase("transit");
    fadeElement(viewerWrapperRef.current, 0, config.TRANSITION_ROOM_MS);
    clearTimer();
    timerRef.current = setTimeout(() => {
      setCurrentPage(target);
      // Prologue → room 01 is free; every other move appends to the path.
      setPath((prev) => fromPage === "00" ? [target] : [...prev, target]);
    }, Math.round(config.TRANSITION_ROOM_MS * 0.5));
  };

  // Called when the user clicks a door hotspot.
  const handleHotspotClick = useCallback(
    (target) => {
      if (phase !== "idle") return;

      // Record whether we've been here before so handleTransitClick can decide
      // whether to reopen the panel.
      isRevisitRef.current = path.includes(target);

      setTravelExit(getNarrative(currentPage)?.travel?.exit ?? "");
      setTravelEnter(getNarrative(target)?.travel?.enter ?? "");
      setTransitReady(false);

      clearTimer();

      if (panelOpen) {
        // Close the panel first, then begin the transit once it has slid away.
        setPanelOpen(false);
        setPhase("closing");
        timerRef.current = setTimeout(
          () => beginTransit(target),
          config.TRANSITION_PANEL_MS,
        );
      } else {
        beginTransit(target);
      }
    },
    [phase, panelOpen, currentPage, path], // eslint-disable-line react-hooks/exhaustive-deps
  );

  // Called by the new PageViewer's OSD when its tileset is open and rendered.
  const handleOSDReady = () => {
    clearTimer();
    fadeElement(viewerWrapperRef.current, 1, config.TRANSITION_ROOM_MS);
    setTransitReady(true);
  };

  // Called when the user clicks the overlay after the new room has loaded.
  const handleTransitClick = useCallback(() => {
    if (phase !== "transit" || !transitReady) return;

    setPhase("revealing"); // overlay fades out (TRANSITION_OVERLAY_MS CSS)

    clearTimer();
    timerRef.current = setTimeout(() => {
      setPhase("idle");
      // Only open the panel automatically on a first visit to this room.
      if (!isRevisitRef.current) setPanelOpen(true);
    }, config.TRANSITION_OVERLAY_MS + 100);
  }, [phase, transitReady]);

  const isTransitioning = phase !== "idle";

  return (
    <Container>
      <NarrativePanel page={currentPage} isOpen={panelOpen} tvMode={tvMode} path={path} />

      <ToggleButton
        $panelOpen={panelOpen}
        $disabled={isTransitioning}
        onClick={() => !isTransitioning && setPanelOpen((o) => !o)}
        aria-label={
          panelOpen ? "Close narrative panel" : "Open narrative panel"
        }
      >
        <span>◀</span>
      </ToggleButton>

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
        tvMode={tvMode}
      />

      <ColorBurnOverlay />
    </Container>
  );
};

export default App;
