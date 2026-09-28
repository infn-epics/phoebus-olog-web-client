import { useState } from "react";
import { Alert, Box, Button, Collapse, LinearProgress, ListItemButton, ListItemText, Stack, Typography } from "@mui/material";
import ExpandLess from "@mui/icons-material/ExpandLess";
import ExpandMore from "@mui/icons-material/ExpandMore";
import { useNavigate, useParams } from "react-router-dom";
import { SearchResultSingleItem } from "./SearchResultList/SearchResultSingleItem";
import { ologApi } from "api/ologApi";
import { useAuthData } from "src/auth/authContext";
import { getLogEntryGroupId } from "components/Properties";

const PAGE_SIZE = 25;

function LogbookEntries({ name }) {
  const [page, setPage] = useState(0);
  const navigate = useNavigate();
  const { id } = useParams();
  const { currentData, isFetching, isError, refetch } = ologApi.endpoints.searchLogs.useQuery({
    logbooks: name, from: page * PAGE_SIZE, size: PAGE_SIZE, sort: "down"
  }, { refetchOnMountOrArgChange: true });
  const logs = currentData?.logs ?? [];

  return <Box sx={{ backgroundColor: "#fafafa" }}>
    {isFetching && <LinearProgress aria-label="Loading entries" />}
    {isError && <Alert severity="error" action={<Button onClick={refetch}>Retry</Button>}>Unable to load entries.</Alert>}
    {!isFetching && !isError && logs.length === 0 && <Typography sx={{ p: 2 }}>No entries.</Typography>}
    <Box role="region" aria-label={`Entries in ${name}`}>
      {logs.map((log) => <SearchResultSingleItem
        key={log.id}
        log={log}
        selected={String(log.id) === id}
        isReply={!!getLogEntryGroupId(log.properties)}
        onClick={(logId) => navigate(`/logs/${logId}`)}
      />)}
    </Box>
    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ p: 1 }}>
      <Button disabled={page === 0 || isFetching} onClick={() => setPage((value) => value - 1)}>Previous</Button>
      <Typography variant="caption">Page {page + 1}</Typography>
      <Button disabled={isFetching || !currentData || (page + 1) * PAGE_SIZE >= currentData.hitCount} onClick={() => setPage((value) => value + 1)}>Next</Button>
    </Stack>
  </Box>;
}

export default function LogbookBrowser() {
  const { isAuthenticated, isAuthenticating } = useAuthData();
  const [expanded, setExpanded] = useState(null);
  const { currentData: permissions = [], isFetching, isError, refetch } =
    ologApi.endpoints.getMyLogbookPermissions.useQuery(undefined, {
      skip: !isAuthenticated, refetchOnMountOrArgChange: true
    });
  const logbooks = permissions.filter((item) => item.admin || item.permissions?.some((permission) => ["READ", "WRITE", "ADMIN"].includes(permission)))
    .sort((a, b) => a.logbook.localeCompare(b.logbook));

  return <Box component="nav" aria-label="Accessible logbooks" sx={{ overflow: "auto", minHeight: 0 }}>
    <Typography variant="h6" sx={{ p: 2 }}>Logbooks</Typography>
    {(isAuthenticating || isFetching) && <LinearProgress aria-label="Loading logbooks" />}
    {!isAuthenticated && !isAuthenticating && <Typography sx={{ px: 2, pb: 2 }}>Sign in to see your logbooks.</Typography>}
    {isAuthenticated && isError && <Alert severity="error" action={<Button onClick={refetch}>Retry</Button>}>Unable to load logbooks.</Alert>}
    {isAuthenticated && !isFetching && !isError && logbooks.length === 0 && <Typography sx={{ p: 2 }}>No accessible logbooks.</Typography>}
    {isAuthenticated && logbooks.map((item) => {
      const open = expanded === item.logbook;
      return <Box key={item.logbook}>
        <ListItemButton aria-expanded={open} onClick={() => setExpanded(open ? null : item.logbook)}>
          <ListItemText primary={item.logbook} secondary={item.admin ? "Administrator" : item.permissions.join(" / ")} primaryTypographyProps={{ sx: { overflowWrap: "anywhere" } }} />
          {open ? <ExpandLess /> : <ExpandMore />}
        </ListItemButton>
        <Collapse in={open} unmountOnExit>
          {open && <LogbookEntries name={item.logbook} />}
        </Collapse>
      </Box>;
    })}
  </Box>;
}
