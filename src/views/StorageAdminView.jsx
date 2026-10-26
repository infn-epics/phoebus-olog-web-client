import { Alert, Button, CircularProgress, Stack, Typography } from "@mui/material";
import { InternalButtonLink } from "components/shared/Link";
import StoragePanel from "components/log/StoragePanel";
import { ologApi } from "api/ologApi";
import { useAuthData } from "src/auth/authContext";

export default function StorageAdminView() {
  const { isAuthenticated, isAuthenticating, logIn } = useAuthData();
  const access = ologApi.endpoints.getStoragePermissions.useQuery(undefined, {
    skip: !isAuthenticated, refetchOnMountOrArgChange: true
  });
  let content;
  if (isAuthenticating) {
    content = <CircularProgress aria-label="Checking administrator access" />;
  } else if (!isAuthenticated || access.error?.status === 401) {
    content = <Alert severity="info" action={<Button onClick={() => logIn()}>Sign in</Button>}>Sign in as an Olog administrator to manage quota requests.</Alert>;
  } else if (access.isFetching) {
    content = <CircularProgress aria-label="Checking administrator access" />;
  } else if (access.error && access.error.status !== 403) {
    content = <Alert severity="error" action={<Button onClick={access.refetch}>Retry</Button>}>Unable to verify administrator access.</Alert>;
  } else if (access.error || !access.currentData?.administrator) {
    content = <Alert severity="warning">Access restricted to global Olog administrators.</Alert>;
  } else {
    content = <StoragePanel summary={access.currentData} />;
  }
  return <Stack gap={3} p={4} maxWidth="1100px" width="100%" mx="auto">
    <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", sm: "center" }} gap={2}>
      <Typography variant="h4">Administration</Typography>
      <InternalButtonLink to="/logbooks">Your logbooks</InternalButtonLink>
    </Stack>
    <Typography color="text.secondary">Review requests to increase an individual logbook's storage quota. Approval applies only to the selected logbook.</Typography>
    {content}
  </Stack>;
}
