import styled from "styled-components";
import { narrative as narrativeData } from "../data/narrative";

const Container = styled.div`
  z-index: 100;
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(10px);
  transition: opacity 1200ms ease;
  opacity: ${({ $isVisible }) => ($isVisible ? 1 : 0)};
  pointer-events: ${({ $isVisible }) => ($isVisible ? "auto" : "none")};
`;

const Content = styled.div`
  width: min(470px, 90vw);
  text-align: justify;
  text-justify: inter-word;
  hyphens: auto;
  word-spacing: -0.05em;
  overflow-wrap: break-word;
  p {
    text-indent: 20px;
  }
`;

const getNarrativeData = (page) => {
  const narrative = narrativeData.find((n) => n.page === page);
  return {
    content: narrative?.content ?? "",
  };
};

// NarrativeOverlay is now fully controlled — visibility is managed by App.
// isVisible: boolean
// onDismiss: () => void
const NarrativeOverlay = ({ page, isVisible, onDismiss }) => {
  const { content } = getNarrativeData(page);

  return (
    <Container $isVisible={isVisible} onClick={onDismiss}>
      <Content dangerouslySetInnerHTML={{ __html: content }} />
    </Container>
  );
};

export default NarrativeOverlay;
