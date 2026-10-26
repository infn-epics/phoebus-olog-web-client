import { ListItem } from "@mui/material";
import { InternalButtonLink } from "components/shared/Link";
import { ologApi } from "api/ologApi";
import { useAuthData } from "src/auth/authContext";

export default function QuotaAdminNavItem() {
  const { isAuthenticated, isAuthenticating } = useAuthData();
  const access = ologApi.endpoints.getStoragePermissions.useQuery(undefined, {
    skip: !isAuthenticated, refetchOnMountOrArgChange: true
  });
  if (!isAuthenticated || isAuthenticating || access.error || !access.currentData?.administrator) return null;
  return <ListItem sx={{ padding: 0 }}>
    <InternalButtonLink to="/admin/storage" variant="outlined" color="primary"
      sx={{ padding: "6px 15px", fontSize: "0.8rem", boxShadow: "none" }}>Admin</InternalButtonLink>
  </ListItem>;
}
