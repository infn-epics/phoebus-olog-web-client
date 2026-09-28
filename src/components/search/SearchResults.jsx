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

export const SearchResults = styled(({ className }) => {
  const { isAuthenticated } = useAuthData();
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

  const {
    currentData: searchResults = {
      logs: [],
      hitCount: 0
    },
    error,
    isLoading: loading,
    isFetching: isFetchingSearchResults
  } = ologApi.endpoints.searchLogs.useQuery(searchLogsQuery, {
    skip: !isAuthenticated,
    refetchOnMountOrArgChange: true,
    refetchOnFocus: true
  });

  if (!isAuthenticated) {return <Alert severity="info">Sign in to search log entries.</Alert>;}
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
      {loading && <LinearProgress />}
      {error && (
        <Box>
          <Alert severity="error">
            {error?.status === "FETCH_ERROR"
              ? "Error: Log Service Unavailable"
              : `${error?.data?.error ?? "Error"}: ${error?.data?.message ?? "Unknown"}`}
          </Alert>
        </Box>
      )}
      {searchResults?.logs?.length > 0 ? (
        <SearchResultList
          logs={searchResults.logs}
          isFetchingSearchResults={isFetchingSearchResults}
        />
      ) : (
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
})({});
