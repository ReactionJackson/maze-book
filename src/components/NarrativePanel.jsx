import styled from "styled-components";
import { narrative as narrativeData } from "../data/narrative";
import { config } from "../config";

// Outer shell — this is what changes width to drive the slide animation.
// overflow: hidden clips the inner content as it collapses.
// Panel owns the background and the texture pseudo-element.
// overflow: hidden is what clips both when the panel slides closed —
// so the texture must live here, not on a fixed/absolute child.
const Panel = styled.aside`
  width: ${({ $open }) => ($open ? config.PANEL_WIDTH : 0)}px;
  flex-shrink: 0;
  height: 100%;
  overflow: hidden;
  transition: width ${config.TRANSITION_PANEL_MS}ms ease;
  position: relative;
  z-index: 300;
  background: #000;

  &::before {
    content: "";
    position: absolute;
    inset: 0;
    background: url("/images/panel-texture.png") left top / cover no-repeat;
    opacity: 0.3;
    pointer-events: none;
  }
`;

// Inner content is always 320px so text never reflows during the animation.
// background: transparent lets Panel's black + texture show through.
// z-index: 1 ensures the content paints above Panel's ::before (z-index: 0).
const PanelInner = styled.div`
  position: relative;
  z-index: 10;
  width: ${config.PANEL_WIDTH}px;
  height: 100%;
  background: transparent;
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

  h1 {
    color: ${({ $tvMode }) =>
      $tvMode ? "#b4a855" : "rgba(252, 247, 226, 0.75)"};
    font-size: max(2.5vw, 36px);
    margin-bottom: 0.3em;
  }

  p {
    color: ${({ $tvMode }) =>
      $tvMode ? "#b4a855" : "rgba(252, 247, 226, 0.75)"};
    margin-bottom: 0.8em;

    q {
      color: ${({ $tvMode }) => ($tvMode ? "#fcf6cd" : "#fcf7e2")};
    }

    &:first-child {
      text-indent: 0;
    }

    &:last-child {
      margin-bottom: 0;
    }
  }
`;

// Flex-centres CurrentRoomBlock and clips history that overflows to the left.
const JournalHeader = styled.div`
  display: flex;
  justify-content: center;
  position: relative;
  padding-bottom: 1.2em;
  flex-shrink: 0;

  /* Gradient covers from the panel's left edge (behind the padding) to the
     centred number. left: -200px overshoots safely; Panel clips the rest. */
  &::before {
    content: "";
    position: absolute;
    left: -200px;
    top: 0;
    bottom: 0;
    right: 50%;
    height: 60px;
    background: linear-gradient(to right, #000 35%, transparent 100%);
    pointer-events: none;
    z-index: 1;
  }
`;

// Positioned ancestor for HistoryRow. Number + step stack as a normal flex column.
const CurrentRoomBlock = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
`;

// Absolutely positioned so right edge sits 20px left of CurrentRoomBlock's left edge.
// flex-direction: row-reverse means newest room is rightmost (closest to current).
const HistoryRow = styled.div`
  position: absolute;
  right: calc(100% + 20px);
  top: 0;
  height: 60px;
  display: flex;
  flex-direction: row-reverse;
  align-items: center;
  gap: 5px;
`;

const StepLabel = styled.div`
  display: flex;
  align-items: center;
  gap: 5px;
  color: rgba(252, 247, 226, 0.75);
  font-size: 0.7em;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  span {
    font-size: 2em;
    line-height: 1;
    position: relative;
    top: -0.1em;
  }
`;

const roomImgStyle = (height, faded) => ({
  height,
  flexShrink: 0,
  filter: "invert(1) sepia(1) contrast(1.4)",
  opacity: faded ? 0.4 : 0.9,
  transform: `scale(${faded ? 0.8 : 1})`,
  display: "block",
});

const NarrativePanel = ({ page, isOpen, tvMode, path }) => {
  const narrative = narrativeData.find((n) => n.page === page);
  const content = narrative?.content ?? "";

  const step = path.length - 1;
  const previousRooms = path.slice(0, -1).reverse(); // newest first → closest to current in display

  return (
    <Panel $open={isOpen}>
      <PanelInner>
        <Content $tvMode={tvMode}>
          {path.length > 0 && (
            <JournalHeader>
              <CurrentRoomBlock>
                {/* History grows leftward from 20px outside CurrentRoomBlock */}
                <HistoryRow>
                  {previousRooms.map((room, i) => (
                    <img
                      key={`${room}-${i}`}
                      src={`/images/numbers/room-${room}.jpg`}
                      style={roomImgStyle(30, true)}
                      alt={`Room ${room}`}
                    />
                  ))}
                </HistoryRow>
                <img
                  src={`/images/numbers/room-${page}.jpg`}
                  style={roomImgStyle(60, false)}
                  alt={`Room ${page}`}
                />
                <StepLabel>
                  Step <span>{step}</span>
                </StepLabel>
              </CurrentRoomBlock>
            </JournalHeader>
          )}
          <div dangerouslySetInnerHTML={{ __html: content }} />
        </Content>
      </PanelInner>
    </Panel>
  );
};

export default NarrativePanel;
