import styled from "styled-components";
import { config } from "../config";

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 100;
  background: ${({ $tvMode }) => $tvMode ? "rgba(0, 0, 0, 0.55)" : "rgba(0, 0, 0, 0.65)"};
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  opacity: ${({ $visible }) => ($visible ? 1 : 0)};
  transition: opacity ${config.TRANSITION_OVERLAY_MS}ms ease;
  pointer-events: ${({ $clickable }) => ($clickable ? "auto" : "none")};
  cursor: ${({ $clickable }) => ($clickable ? "pointer" : "default")};
`;

const TravelText = styled.div`
  text-align: center;
  width: 60vw;
  max-width: 100%;
  pointer-events: none;

  p {
    color: ${({ $tvMode }) => $tvMode ? "rgba(252, 247, 226, 0.7)" : "rgba(252, 247, 226, 0.85)"};
    font-size: 2.7vw;
    margin: 1vw 0;

    q {
      color: #fcf7e2;
    }
  }
`;

// phase:        'idle' | 'closing' | 'transit' | 'revealing'
// transitReady: true once the new OSD has fired its open event
const TransitionOverlay = ({
  phase,
  transitReady,
  exitText,
  enterText,
  onTransitClick,
  tvMode,
}) => {
  const isVisible = phase === "transit";
  const isClickable = phase === "transit" && transitReady;
  const text = [exitText, enterText].filter(Boolean).join(" ");

  return (
    <Overlay
      $visible={isVisible}
      $clickable={isClickable}
      $tvMode={tvMode}
      onClick={isClickable ? onTransitClick : undefined}
    >
      <TravelText $tvMode={tvMode}>
        <p dangerouslySetInnerHTML={{ __html: text }} />
      </TravelText>
    </Overlay>
  );
};

export default TransitionOverlay;
