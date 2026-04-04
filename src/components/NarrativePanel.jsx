import styled from "styled-components";
import { narrative as narrativeData } from "../data/narrative";
import { config } from "../config";

// Outer shell — this is what changes width to drive the slide animation.
// overflow: hidden clips the inner content as it collapses.
const Panel = styled.aside`
  width: ${({ $open }) => ($open ? config.PANEL_WIDTH : 0)}px;
  flex-shrink: 0;
  height: 100%;
  overflow: hidden;
  transition: width ${config.TRANSITION_PANEL_MS}ms ease;
  position: relative;
  z-index: 300;
`;

// Inner content is always 320px so text never reflows during the animation.
const PanelInner = styled.div`
  width: ${config.PANEL_WIDTH}px;
  height: 100%;
  background: #000;
  padding: max(3vw, 40px);
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  scrollbar-width: none;
  &::-webkit-scrollbar {
    display: none;
  }
`;

const Content = styled.div`
  margin-block: auto;
  text-align: justify;
  text-justify: inter-word;
  hyphens: auto;
  overflow-wrap: break-word;

  p {
    color: ${({ $tvMode }) => $tvMode ? "#b4a855" : "rgba(252, 247, 226, 0.75)"};
    margin-bottom: 0.8em;

    q {
      color: ${({ $tvMode }) => $tvMode ? "#fcf6cd" : "#fcf7e2"};
    }

    &:first-child {
      text-indent: 0;
    }

    &:last-child {
      margin-bottom: 0;
    }
  }
`;

const NarrativePanel = ({ page, isOpen, tvMode }) => {
  const narrative = narrativeData.find((n) => n.page === page);
  const content = narrative?.content ?? "";

  return (
    <Panel $open={isOpen}>
      <PanelInner>
        <Content $tvMode={tvMode}>
          {page !== "00" && (
            <img
              src={`/images/numbers/room-${page}.jpg`}
              style={{
                height: 60,
                marginBottom: "1.2em",
                filter: "invert(1) sepia(0.8) contrast(1.4)",
              }}
            />
          )}
          <div dangerouslySetInnerHTML={{ __html: content }} />
        </Content>
      </PanelInner>
    </Panel>
  );
};

export default NarrativePanel;
