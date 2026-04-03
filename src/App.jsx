import { useState } from "react";
import styled from "styled-components";
import PageViewer from "./components/PageViewer";

const Container = styled.div`
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
`;

const App = () => {
  const [currentPage, setCurrentPage] = useState(0);
  return (
    <Container>
      <PageViewer page={currentPage} />
    </Container>
  );
};

export default App;
