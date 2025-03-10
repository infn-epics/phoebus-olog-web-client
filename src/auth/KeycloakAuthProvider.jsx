import { AuthProvider, useAuth } from "react-oauth2-code-pkce";
import oauthConfig from "./authContext";

export const KeycloakAuthProvider = ({ children }) => (
  <AuthProvider
    authConfig={oauthConfig}
    onAccessTokenExpiry={(refreshToken) => refreshToken()}
    onAuthError={(error) => console.error(error)}
  >
    {children}
  </AuthProvider>
);

export const useKeycloakAuth = () => {
  const { authService } = useAuth();
  return authService;
};