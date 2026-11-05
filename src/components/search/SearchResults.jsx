import {
  Alert,
  Box,
  Divider,
  LinearProgress,
  Stack,
  Typography,
  styled
} from "@mui/material";
import { useMemo } from "react";
import { SearchResultList } from "./SearchResultList";
import { SearchParamsBadges } from "./SearchParamsBadges";
import { ologApi } from "api/ologApi";
import { useSearchPageParams } from "features/searchPageParamsReducer";
import { useEnhancedSearchParams } from "src/hooks/useEnhancedSearchParams";
import { useAuthData } from "src/auth/authContext";

const NO_RESULTS = { logs: [], hitCount: 0 };

// Rendered only when signed in: unmounting on sign-out drops the results that
// `data` would otherwise still hold for the next user.
const AuthenticatedSearchResults = ({ className }) => {
  const { searchParams, isSearchActive } = useEnhancedSearchParams();
  const searchPageParams = useSearchPageParams();

  const searchLogsQuery = useMemo(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    let params = {
      ...searchPageParams,
      ...searchParams,
      tz
    };

    return params;
  }, [searchPageParams, searchParams]);

  // `data` rather than `currentData`: it keeps the previous results while the next
  // page loads, so the list stays mounted instead of flashing empty on every fetch.
  const {
    data,
    error,
    isFetching: isFetchingSearchResults
  } = ologApi.endpoints.searchLogs.useQuery(searchLogsQuery, {
    refetchOnMountOrArgChange: true,
    refetchOnFocus: true
  });
  const { logs, hitCount } = (!error && data) || NO_RESULTS;

  return (
    <Stack
      className={`SearchResultList ${className}`}
      position="relative"
      sx={{ backgroundColor: "#fafafa", minHeight: 0 }}
    >
      {isSearchActive && (
        <Box>
          <Box px={4}>
            <Stack
              flexDirection="row"
              justifyContent="space-between"
              alignItems="center"
              pt={1}
            >
              <SearchParamsBadges />
            </Stack>
          </Box>
          <Divider sx={{ marginTop: 1, borderWidth: "1px" }} />
        </Box>
      )}
      {isFetchingSearchResults && logs.length === 0 && <LinearProgress />}
      {error && (
        <Box>
          <Alert severity="error">
            {error?.status === "FETCH_ERROR"
              ? "Error: Log Service Unavailable"
              : `${error?.data?.error ?? "Error"}: ${error?.data?.message ?? "Unknown"}`}
          </Alert>
        </Box>
      )}
      {logs.length > 0 && (
        <SearchResultList
          logs={logs}
          isFetchingSearchResults={isFetchingSearchResults}
          hasMoreLogs={logs.length < hitCount}
        />
      )}
      {logs.length === 0 && !isFetchingSearchResults && !error && (
        <Box
          flex={1}
          py={2}
          px={4}
        >
          <Typography>No records found</Typography>
        </Box>
      )}
    </Stack>
  );
};

export const SearchResults = styled(({ className }) => {
  const { isAuthenticated } = useAuthData();

  if (!isAuthenticated) {return <Alert severity="info">Sign in to search log entries.</Alert>;}
  return <AuthenticatedSearchResults className={className} />;
})({});
