import { Alert, LinearProgress } from "@mui/material";
import LogHistory from "./LogHistory";
import { ologApi } from "api/ologApi";
import { ServerErrorPage } from "components/shared/error";
import { useAuthData } from "src/auth/authContext";

const LogHistoryContainer = ({ id }) => {
  const { isAuthenticated, isAuthenticating } = useAuthData();
  const {
    currentData: currentLog,
    isLoading: loadingCurrentLog,
    error: currentLogError
  } = ologApi.endpoints.getLog.useQuery({ id }, { skip: !isAuthenticated });
  const {
    currentData: logHistory,
    isLoading: loadingLogHistory,
    error: logHistoryError
  } = ologApi.endpoints.getArchivedLogbooks.useQuery({ id }, { skip: !isAuthenticated });

  if (loadingCurrentLog || loadingLogHistory || isAuthenticating) {
    return <LinearProgress width="100%" />;
  }

  const renderError = (error, message) => {
    if (error.status === 403) {return <Alert severity="warning">You do not have permission to view this history or it is outside your permitted period.</Alert>;}
    if (error.status === 404) {
      return (
        <ServerErrorPage
          message={message}
          status={error?.code}
        />
      );
    }
    return <ServerErrorPage status={error?.code} />;
  };

  if (currentLogError) {
    return renderError(currentLogError);
  }
  if (logHistoryError) {
    return renderError(logHistoryError);
  }

  if (!isAuthenticated) {return <Alert severity="info">Sign in to view log history.</Alert>;}
  return currentLog && logHistory ? <LogHistory {...{ currentLog, logHistory }} /> : <LinearProgress />;
};
export default LogHistoryContainer;
