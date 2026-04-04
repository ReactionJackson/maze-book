import { useState, useEffect, useRef, useCallback } from "react";
import styled from "styled-components";
import OpenSeadragon from "openseadragon";
import { hotspots as hotspotData } from "../data/hotspots";
import { config } from "../config";

const Wrapper = styled.div`
  display: flex;
  width: 100vw;
  height: 100vh;
  background: #111;
  font-family: monospace;
  font-size: 13px;
  color: #eee;
`;

const ViewerArea = styled.div`
  position: relative;
  flex: 1;
  min-width: 0;
  cursor: ${({ $drawMode }) => ($drawMode ? "crosshair" : "default")};
  user-select: none;
`;

const OsdContainer = styled.div`
  width: 100%;
  height: 100%;
`;

const ClickOverlay = styled.div`
  position: absolute;
  inset: 0;
  pointer-events: ${({ $drawMode }) => ($drawMode ? "all" : "none")};
`;

const PreviewSvg = styled.svg`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  overflow: visible;
`;

// ─── Panel ───────────────────────────────────────────────────────────────────

const Panel = styled.div`
  width: 300px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  background: #1a1a1a;
  border-left: 1px solid #333;
  overflow: hidden;
`;

const PanelSection = styled.div`
  padding: 12px;
  border-bottom: 1px solid #2a2a2a;
`;

const PanelTitle = styled.div`
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #666;
  margin-bottom: 8px;
`;

const Row = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
`;

const Btn = styled.button`
  padding: 5px 10px;
  border-radius: 4px;
  border: 1px solid #444;
  background: ${({ $active, $danger }) =>
    $danger ? "#3a1a1a" : $active ? "#f90" : "#2a2a2a"};
  color: ${({ $active, $danger }) =>
    $danger ? "#f66" : $active ? "#000" : "#ccc"};
  border-color: ${({ $danger }) => ($danger ? "#f66" : "#444")};
  cursor: pointer;
  font-family: inherit;
  font-size: 12px;
  &:hover:not(:disabled) {
    background: ${({ $active, $danger }) =>
      $danger ? "#4a1a1a" : $active ? "#ffa833" : "#333"};
  }
  &:disabled {
    opacity: 0.4;
    cursor: default;
  }
`;

const PageNum = styled.div`
  flex: 1;
  text-align: center;
  font-size: 15px;
  font-weight: bold;
`;

const HotspotList = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 8px 12px;
`;

const HotspotItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 8px;
  border-radius: 4px;
  background: #222;
  margin-bottom: 4px;
  border: 1px solid #2e2e2e;
`;

const HotspotLabel = styled.div`
  font-size: 12px;
  color: #aaa;
  span {
    color: ${({ $colour }) => $colour || "#f90"};
    font-weight: bold;
  }
`;

const DeleteBtn = styled.button`
  background: none;
  border: none;
  color: #555;
  cursor: pointer;
  font-size: 16px;
  padding: 0 2px;
  line-height: 1;
  &:hover {
    color: #f44;
  }
`;

const PendingForm = styled.div`
  background: #222;
  border: 1px solid #f90;
  border-radius: 4px;
  padding: 10px;
`;

const Input = styled.input`
  width: 100%;
  padding: 5px 8px;
  background: #111;
  border: 1px solid #444;
  border-radius: 4px;
  color: #eee;
  font-family: inherit;
  font-size: 13px;
  box-sizing: border-box;
  margin: 6px 0;
  &:focus {
    outline: none;
    border-color: #f90;
  }
`;

const Hint = styled.div`
  font-size: 11px;
  color: #555;
  margin-top: 6px;
`;

const JsonArea = styled.textarea`
  width: 100%;
  flex: 1;
  background: #111;
  border: none;
  color: #7ec;
  font-family: monospace;
  font-size: 11px;
  padding: 10px;
  resize: none;
  box-sizing: border-box;
  &:focus {
    outline: none;
  }
`;

const CopyBtn = styled(Btn)`
  width: 100%;
  margin-top: 6px;
`;

// ─── Helpers ─────────────────────────────────────────────────────────────────

const buildOverlaySvg = (hotspots) => {
  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("viewBox", `0 0 1 ${config.IMG_H_RATIO}`);
  svg.style.cssText = "width:100%;height:100%;display:block;overflow:visible;";

  hotspots.forEach((hs, i) => {
    const colour = config.EDITOR_COLOURS[i % config.EDITOR_COLOURS.length];
    const poly = document.createElementNS(svgNS, "polygon");
    poly.setAttribute("points", hs.points.map((p) => `${p.x},${p.y}`).join(" "));
    poly.setAttribute("fill", `${colour}33`);
    poly.setAttribute("stroke", colour);
    poly.setAttribute("stroke-width", "0.003");
    poly.style.pointerEvents = "none";
    svg.appendChild(poly);

    // Label at centroid
    const cx = hs.points.reduce((s, p) => s + p.x, 0) / hs.points.length;
    const cy = hs.points.reduce((s, p) => s + p.y, 0) / hs.points.length;
    const text = document.createElementNS(svgNS, "text");
    text.setAttribute("x", cx);
    text.setAttribute("y", cy);
    text.setAttribute("text-anchor", "middle");
    text.setAttribute("dominant-baseline", "middle");
    text.setAttribute("font-size", "0.025");
    text.setAttribute("font-weight", "bold");
    text.setAttribute("fill", "#fff");
    text.style.pointerEvents = "none";
    text.textContent = `→${hs.target}`;
    svg.appendChild(text);
  });

  return svg;
};

// ─── Component ───────────────────────────────────────────────────────────────

const HotspotEditor = () => {
  const osdContainerRef = useRef(null);
  const clickOverlayRef = useRef(null);
  const osdRef = useRef(null);
  const overlaySvgRef = useRef(null);

  const [pageIndex, setPageIndex] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const [mode, setMode] = useState("draw"); // "pan" | "draw"
  const [hotspots, setHotspots] = useState(() => {
    const existing = hotspotData.find((p) => p.page === "00");
    return existing?.hotspots ?? [];
  });

  const [drawPoints, setDrawPoints] = useState([]);
  const [mousePos, setMousePos] = useState(null);
  const [pendingPoints, setPendingPoints] = useState(null);
  const [pendingTarget, setPendingTarget] = useState("");

  const [copied, setCopied] = useState(false);

  const page = pageIndex.toString().padStart(2, "0");

  const goToPage = useCallback((newIndex) => {
    const newPage = newIndex.toString().padStart(2, "0");
    setPageIndex(newIndex);
    setIsReady(false);
    setDrawPoints([]);
    setMousePos(null);
    setPendingPoints(null);
    setPendingTarget("");
    setMode("draw");
    const existing = hotspotData.find((p) => p.page === newPage);
    setHotspots(existing?.hotspots ?? []);
  }, []);

  // ── OSD init ───────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!osdContainerRef.current) return;

    const viewer = OpenSeadragon({
      element: osdContainerRef.current,
      keyboardShortcuts: false,
      showNavigationControl: true,
      gestureSettingsMouse: { clickToZoom: false },
      gestureSettingsTouch: { clickToZoom: false },
    });

    viewer.addHandler("open", () => setIsReady(true));
    osdRef.current = viewer;

    return () => {
      viewer.destroy();
      osdRef.current = null;
    };
  }, []);

  // ── Open tile source when page changes (no setState here) ─────────────────

  useEffect(() => {
    if (!osdRef.current) return;
    osdRef.current.open(`/images/rooms/dzi/room-${page}.dzi`);
  }, [page]);

  // ── Sync OSD overlay SVG ──────────────────────────────────────────────────

  useEffect(() => {
    if (!isReady || !osdRef.current) return;
    const viewer = osdRef.current;

    if (overlaySvgRef.current) {
      viewer.removeOverlay(overlaySvgRef.current);
    }

    const svg = buildOverlaySvg(hotspots);
    overlaySvgRef.current = svg;

    viewer.addOverlay({
      element: svg,
      location: new OpenSeadragon.Rect(0, 0, 1, config.IMG_H_RATIO),
    });
  }, [hotspots, isReady]);

  // ── Toggle OSD pan ────────────────────────────────────────────────────────

  useEffect(() => {
    osdRef.current?.setMouseNavEnabled(mode === "pan");
  }, [mode]);

  // ── Finish / confirm polygon ───────────────────────────────────────────────

  const finishPolygon = (points) => {
    setPendingPoints(points.map((p) => p.viewport));
    setDrawPoints([]);
    setMousePos(null);
    setMode("draw");
  };

  const confirmHotspot = () => {
    if (!pendingPoints || !pendingTarget.trim()) return;
    const id = `p${page}-h${String(hotspots.length + 1).padStart(2, "0")}`;
    setHotspots((prev) => [
      ...prev,
      { id, target: pendingTarget.trim().padStart(2, "0"), points: pendingPoints },
    ]);
    setPendingPoints(null);
    setPendingTarget("");
  };

  // ── Keyboard shortcuts ────────────────────────────────────────────────────

  useEffect(() => {
    const onKey = (e) => {
      if (mode === "draw") {
        if (e.key === "Escape") {
          setDrawPoints([]);
          setMousePos(null);
          setMode("pan");
        }
        if ((e.key === "Backspace" || e.key === "Delete") && !e.target.closest("input")) {
          setDrawPoints((prev) => prev.slice(0, -1));
        }
        if (e.key === "Enter" && drawPoints.length >= 3) {
          finishPolygon(drawPoints);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mode, drawPoints]);

  // ── Draw: click to add point ──────────────────────────────────────────────

  const handleClick = useCallback(
    (e) => {
      if (mode !== "draw" || !osdRef.current) return;
      const bounds = clickOverlayRef.current.getBoundingClientRect();
      const screen = { x: e.clientX - bounds.left, y: e.clientY - bounds.top };
      const vp = osdRef.current.viewport.windowToViewportCoordinates(
        new OpenSeadragon.Point(e.clientX, e.clientY)
      );
      setDrawPoints((prev) => [
        ...prev,
        { screen, viewport: { x: parseFloat(vp.x.toFixed(4)), y: parseFloat(vp.y.toFixed(4)) } },
      ]);
    },
    [mode]
  );

  const handleMouseMove = useCallback(
    (e) => {
      if (mode !== "draw") return;
      const bounds = clickOverlayRef.current?.getBoundingClientRect();
      if (!bounds) return;
      setMousePos({ x: e.clientX - bounds.left, y: e.clientY - bounds.top });
    },
    [mode]
  );

  // ── Render helpers ────────────────────────────────────────────────────────

  const allDrawnPoints = drawPoints.map((p) => p.screen);
  const previewPoints = mousePos
    ? [...allDrawnPoints, mousePos]
    : allDrawnPoints;

  const jsonOutput = JSON.stringify({ page, hotspots }, null, 2);

  const copyJson = () => {
    navigator.clipboard.writeText(jsonOutput).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <Wrapper>
      <ViewerArea $drawMode={mode === "draw"}>
        <OsdContainer ref={osdContainerRef} />

        {/* SVG preview for in-progress polygon */}
        {drawPoints.length > 0 && (
          <PreviewSvg>
            {previewPoints.length >= 3 && (
              <polygon
                points={previewPoints.map((p) => `${p.x},${p.y}`).join(" ")}
                fill="rgba(255,153,0,0.12)"
                stroke="none"
              />
            )}
            {allDrawnPoints.map((p, i) => {
              const next = allDrawnPoints[i + 1];
              return (
                <g key={i}>
                  {next && (
                    <line
                      x1={p.x} y1={p.y}
                      x2={next.x} y2={next.y}
                      stroke="#f90" strokeWidth="1.5"
                    />
                  )}
                  <circle cx={p.x} cy={p.y} r={5} fill="#f90" stroke="#000" strokeWidth="1" />
                </g>
              );
            })}
            {/* Rubber-band line from last point to cursor */}
            {mousePos && drawPoints.length > 0 && (
              <line
                x1={allDrawnPoints[allDrawnPoints.length - 1].x}
                y1={allDrawnPoints[allDrawnPoints.length - 1].y}
                x2={mousePos.x}
                y2={mousePos.y}
                stroke="#f90"
                strokeWidth="1.5"
                strokeDasharray="5,4"
              />
            )}
            {/* Closing line preview (last point back to first) */}
            {mousePos && drawPoints.length >= 2 && (
              <line
                x1={allDrawnPoints[0].x}
                y1={allDrawnPoints[0].y}
                x2={mousePos.x}
                y2={mousePos.y}
                stroke="#f905"
                strokeWidth="1"
                strokeDasharray="3,5"
              />
            )}
          </PreviewSvg>
        )}

        <ClickOverlay
          ref={clickOverlayRef}
          $drawMode={mode === "draw"}
          onClick={handleClick}
          onMouseMove={handleMouseMove}
        />
      </ViewerArea>

      <Panel>
        {/* Page navigation */}
        <PanelSection>
          <PanelTitle>Page</PanelTitle>
          <Row>
            <Btn onClick={() => goToPage(Math.max(0, pageIndex - 1))} disabled={pageIndex === 0}>‹</Btn>
            <PageNum>{page}</PageNum>
            <Btn onClick={() => goToPage(Math.min(config.TOTAL_PAGES - 1, pageIndex + 1))} disabled={pageIndex === config.TOTAL_PAGES - 1}>›</Btn>
          </Row>
        </PanelSection>

        {/* Mode + draw controls */}
        <PanelSection>
          <PanelTitle>Mode</PanelTitle>
          <Row>
            <Btn $active={mode === "pan"} onClick={() => { setDrawPoints([]); setMousePos(null); setMode("pan"); }}>
              Pan
            </Btn>
            <Btn $active={mode === "draw"} onClick={() => setMode("draw")} disabled={!isReady}>
              Draw hotspot
            </Btn>
          </Row>
          {mode === "draw" && (
            <Row style={{ marginTop: 8 }}>
              <Btn
                $active
                onClick={() => finishPolygon(drawPoints)}
                disabled={drawPoints.length < 3}
                style={{ flex: 1 }}
              >
                Done ({drawPoints.length} pts)
              </Btn>
              <Btn
                $danger
                onClick={() => setDrawPoints((p) => p.slice(0, -1))}
                disabled={drawPoints.length === 0}
                title="Undo last point"
              >
                ⌫
              </Btn>
            </Row>
          )}
          {mode === "draw" && (
            <Hint>Click to add points · Enter to finish · Esc to cancel</Hint>
          )}
        </PanelSection>

        {/* Pending hotspot form */}
        {pendingPoints && (
          <PanelSection>
            <PanelTitle>New hotspot — set target</PanelTitle>
            <PendingForm>
              <div style={{ fontSize: 11, color: "#888" }}>
                {pendingPoints.length} points
              </div>
              <Input
                placeholder="Target page (e.g. 03)"
                value={pendingTarget}
                onChange={(e) => setPendingTarget(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") confirmHotspot();
                  if (e.key === "Escape") { setPendingPoints(null); setPendingTarget(""); }
                }}
                autoFocus
              />
              <Row>
                <Btn $active onClick={confirmHotspot} disabled={!pendingTarget.trim()}>Add</Btn>
                <Btn onClick={() => { setPendingPoints(null); setPendingTarget(""); }}>Cancel</Btn>
              </Row>
            </PendingForm>
          </PanelSection>
        )}

        {/* Hotspot list */}
        <PanelSection style={{ paddingBottom: 4 }}>
          <PanelTitle>Hotspots ({hotspots.length})</PanelTitle>
        </PanelSection>
        <HotspotList>
          {hotspots.length === 0 && (
            <div style={{ color: "#555", fontStyle: "italic" }}>No hotspots yet</div>
          )}
          {hotspots.map((hs, i) => (
            <HotspotItem key={hs.id}>
              <HotspotLabel $colour={config.EDITOR_COLOURS[i % config.EDITOR_COLOURS.length]}>
                {hs.id} <span>→ {hs.target}</span>
                <div style={{ fontSize: 10, color: "#555" }}>{hs.points.length} pts</div>
              </HotspotLabel>
              <DeleteBtn
                onClick={() => setHotspots((prev) => prev.filter((h) => h.id !== hs.id))}
                title="Delete"
              >
                ×
              </DeleteBtn>
            </HotspotItem>
          ))}
        </HotspotList>

        {/* JSON output */}
        <PanelSection style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
          <PanelTitle>JSON output</PanelTitle>
          <JsonArea value={jsonOutput} readOnly />
          <CopyBtn onClick={copyJson}>{copied ? "Copied!" : "Copy JSON"}</CopyBtn>
        </PanelSection>
      </Panel>
    </Wrapper>
  );
};

export default HotspotEditor;
