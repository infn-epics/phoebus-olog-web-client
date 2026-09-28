import { identityApi } from "api/identityApi";
import { useAuthData } from "src/auth/authContext";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function IdentityName({ identifier }) {
  const auth = useAuthData();
  const lookup = !!auth?.isAuthenticated && UUID_PATTERN.test(identifier ?? "");
  const { currentData: identity, isFetching } = identityApi.endpoints.getIdentity.useQuery(identifier, { skip: !lookup });
  const fullName = lookup ? [identity?.nome, identity?.cognome].filter(Boolean).join(" ") : "";

  return <span title={identifier}>{fullName || (lookup && isFetching ? "Loading…" : identifier || "Unknown author")}</span>;
}
