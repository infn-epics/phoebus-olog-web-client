import { useRef, useState } from "react";
import { Box, Divider, Stack, styled } from "@mui/material";
import { useParams } from "react-router-dom";
import LogDetailsContainer from "src/components/log/LogDetails/LogDetailsContainer";
import { SearchResults } from "components/search";
import LogbookBrowser from "components/search/LogbookBrowser";
import { useEnhancedSearchParams } from "src/hooks/useEnhancedSearchParams";

const ContentView = styled(Box)(({ theme }) => ({
  display: "grid",
  gridTemplateColumns: "1px minmax(240px, var(--logbook-width, 38.5%)) 8px minmax(0, 1fr)",
  gridTemplateRows: "1fr",
  height: "100%",
  [theme.breakpoints.down("md")]: {
    display: "flex",
    flexDirection: "column-reverse",
    height: "100%",
    width: "auto",
    minWidth: 0,
    "& > div": {
      flex: 1
    },
    "& > hr": {
      height: "auto",
      minHeight: "auto"
    }
  }
}));

const SearchView = styled(({ className }) => {
  const { id } = useParams();
  const { isSearchActive } = useEnhancedSearchParams();
  const containerRef = useRef(null);
  const dragRef = useRef(null);
  const [sidebarWidth, setSidebarWidth] = useState(38.5);
  const [resizing, setResizing] = useState(false);
  const resize = (width) => setSidebarWidth(Math.max(20, Math.min(65, width)));

  const startResize = (event) => {
    if (event.button !== 0) {
      return;
    }
    event.preventDefault();
    event.currentTarget.focus();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { x: event.clientX, width: sidebarWidth, containerWidth: containerRef.current.getBoundingClientRect().width };
    setResizing(true);
  };

  const moveResize = (event) => {
    const drag = dragRef.current;
    if (drag?.containerWidth > 0) {
      resize(drag.width + (event.clientX - drag.x) / drag.containerWidth * 100);
    }
  };

  const stopResize = () => {
    dragRef.current = null;
    setResizing(false);
  };

  const resizeWithKeyboard = (event) => {
    const widths = { ArrowLeft: sidebarWidth - 2, ArrowRight: sidebarWidth + 2, Home: 20, End: 65 };
    if (event.key in widths) {
      event.preventDefault();
      resize(widths[event.key]);
    }
  };

  return (
    <Box height="100%">
      <ContentView ref={containerRef} className={`SearchView ${className}`} style={{ "--logbook-width": `${sidebarWidth}%`, userSelect: resizing ? "none" : undefined }}>
        <Divider sx={{ borderColor: "#E2E8EE" }} orientation="vertical" />
        <Stack sx={{ minHeight: 0, overflow: "auto" }}>
          <LogbookBrowser />
          {isSearchActive && <SearchResults />}
        </Stack>
        <Box
          role="separator"
          aria-label="Resize logbook sidebar"
          aria-orientation="vertical"
          aria-valuemin={20}
          aria-valuemax={65}
          aria-valuenow={Math.round(sidebarWidth)}
          tabIndex={0}
          onPointerDown={startResize}
          onPointerMove={moveResize}
          onPointerUp={stopResize}
          onPointerCancel={stopResize}
          onLostPointerCapture={stopResize}
          onKeyDown={resizeWithKeyboard}
          onDoubleClick={() => setSidebarWidth(38.5)}
          sx={{
            display: { xs: "none", md: "block" },
            cursor: "col-resize", touchAction: "none",
            backgroundColor: resizing ? "primary.main" : "#E2E8EE",
            "&:hover, &:focus-visible": { backgroundColor: "primary.main" },
            "&:focus-visible": { outline: "2px solid", outlineColor: "primary.main" }
          }}
        />
        <LogDetailsContainer id={id} />
      </ContentView>
    </Box>
  );
})({
  "& > *": {
    minWidth: 0
  }
});

export default SearchView;
