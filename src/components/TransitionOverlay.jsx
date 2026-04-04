import styled from "styled-components";
import { config } from "../config";

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 200;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  opacity: ${({ $visible }) => ($visible ? 1 : 0)};
  transition: opacity ${config.TRANSITION_OVERLAY_MS}ms ease;
  pointer-events: ${({ $idle }) => ($idle ? "none" : "auto")};
  cursor: ${({ $clickable }) => ($clickable ? "pointer" : "default")};
`;

const TravelText = styled.div`
  text-align: center;
  width: 60vw;
  max-width: 100%;
  p {
    color: #fff;
    font-size: 4vw;
    margin: 1vw 0;
  }
`;

// phase:        'idle' | 'transit' | 'revealing'
// transitReady: true once the new OSD has fired its open event
const TransitionOverlay = ({ phase, transitReady, exitText, enterText, onTransitClick }) => {
  const isVisible = phase === "transit";   // CSS transition handles fade-out when phase → 'revealing'
  const isClickable = phase === "transit" && transitReady;
  const isIdle = phase === "idle";

  return (
    <Overlay
      $visible={isVisible}
      $idle={isIdle}
      $clickable={isClickable}
      onClick={isClickable ? onTransitClick : undefined}
    >
      <TravelText>
        <p>{[exitText, enterText].filter(Boolean).join(" ")}</p>
      </TravelText>
    </Overlay>
  );
};

export default TransitionOverlay;
