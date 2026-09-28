import { useParams } from "react-router-dom";
import { Alert, LinearProgress } from "@mui/material";
import { EditLog } from "components/log/EditLog";
import { ologApi } from "src/api/ologApi";
import { useAuthData } from "src/auth/authContext";

const EditLogView = () => {
  const { isAuthenticated, isAuthenticating } = useAuthData();
  const { id } = useParams();
  const {
    currentData: log,
    isLoading,
    error
  } = ologApi.endpoints.getLog.useQuery(
    { id, noInvalidate: true },
    {
      skip: !isAuthenticated
    }
  );

  if (isLoading || isAuthenticating) {
    return <LinearProgress sx={{ width: "100%" }} />;
  }

  if (error) {
    return (
      <Alert
        severity="error"
        sx={{ m: 2 }}
      >
        {error.status === 403 ? "You do not have permission to access this entry or it is outside your permitted period." : `Error loading log entry ${id}`}
      </Alert>
    );
  }

  if (!isAuthenticated) {return <Alert severity="info">Sign in to edit log entries.</Alert>;}
  return log ? <EditLog log={log} /> : <LinearProgress />;
};

export default EditLogView;
