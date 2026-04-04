import { useState } from "react";
import styled from "styled-components";
import PageViewer from "./components/PageViewer";
import NarrativeOverlay from "./components/NarrativeOverlay";
import HotspotEditor from "./components/HotspotEditor";
import { hotspots as hotspotData } from "./data/hotspots";
import { config } from "./config";

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
    z-index: 100;
  }
`;

const App = () => {
  const [currentPage, setCurrentPage] = useState("00");

  if (config.EDITOR_MODE) return <HotspotEditor />;

  const pageHotspots =
    hotspotData.find((p) => p.page === currentPage)?.hotspots ?? [];

  return (
    <Container>
      <NarrativeOverlay key={`page-${currentPage}`} page={currentPage} />
      <PageViewer
        key={`page-${currentPage}`}
        page={currentPage}
        hotspots={pageHotspots}
        onHotspotClick={(target) => setCurrentPage(target)}
      />
    </Container>
  );
};

export default App;
