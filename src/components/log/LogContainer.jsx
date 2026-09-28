import { Alert, LinearProgress } from "@mui/material";
import { ologApi } from "api/ologApi";
import { ServerErrorPage } from "components/shared/error";
import { useAuthData } from "src/auth/authContext";

const LogContainer = ({ id, renderLog }) => {
  const { isAuthenticated, isAuthenticating } = useAuthData();
  const {
    currentData: log,
    isLoading,
    error
  } = ologApi.endpoints.getLog.useQuery(
    { id },
    {
      refetchOnMountOrArgChange: true,
      skip: !isAuthenticated
    }
  );

  if (isLoading || isAuthenticating) {
    return <LinearProgress width="100%" />;
  }

  if (error) {
    if (error.status === 403) {
      return <Alert severity="warning">You do not have permission to view this entry, or its creation date is outside your permitted period.</Alert>;
    }
    if (error.status === 404) {
      return (
        <ServerErrorPage
          message={"Log not found"}
          status={error?.code}
          homeHref="/"
        />
      );
    }
    return <ServerErrorPage status={error?.code} />;
  }

  if (!isAuthenticated) {return <Alert severity="info">Sign in to view log entries.</Alert>;}
  return log ? renderLog({ log }) : <LinearProgress />;
};
export default LogContainer;
