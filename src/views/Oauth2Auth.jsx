import {
  AuthContext,
  AuthProvider
} from "react-oauth2-code-pkce";
import { useContext, useRef } from "react";

const authService = {
  clientId: "camunda",
  authorizationEndpoint:
    "https://idp-test.app.infn.it/auth/realms/aai/protocol/openid-connect/auth",
  tokenEndpoint:
    "https://idp-test.app.infn.it/auth/realms/aai/protocol/openid-connect/token",
  redirectUri: "http://localhost:3000/",
  scope: "openid",
  onRefreshTokenExpire: (event) => event.logIn(undefined, undefined, "popup")
};

const AUTH_METHOD = import.meta.env.VITE_REACT_APP_AUTH_METHOD || "custom";

export function LoginInfo() {
  const { tokenData, token, logIn, logOut, error } = useContext(AuthContext);
  const dialogRef = useRef(null);

  if (error) {
    return (
      <div>
        <button onClick={() => dialogRef.current.showModal()}>Apri Dialog</button>
        <dialog ref={dialogRef}>
          <p>Questo è un dialog!</p>
          <button onClick={() => dialogRef.current.close()}>Chiudi</button>
        </dialog>
      </div>
    );
  }

  return (
    <>
      {token ? (
        <>
          <div>
            <h4>Access Token (JWT)</h4>
            <pre
              style={{
                width: "400px",
                margin: "10px",
                padding: "5px",
                border: "black 2px solid",
                wordBreak: "break-all",
                whiteSpace: "break-spaces"
              }}
            >
              {token}
            </pre>
          </div>
          <div>
            <h4>Login Information from Access Token (Base64 decoded JWT)</h4>
            <pre
              style={{
                width: "400px",
                margin: "10px",
                padding: "5px",
                border: "black 2px solid",
                wordBreak: "break-all",
                whiteSpace: "break-spaces"
              }}
            >
              {JSON.stringify(tokenData, null, 2)}
            </pre>
          </div>
          <button onClick={() => logOut()}>Log out</button>
        </>
      ) : (
        <>
          <div>You are not logged in.</div>
          <button onClick={() => logIn()}>Log in</button>
        </>
      )}
    </>
  );
}

function Oauth2Auth() {
  if (AUTH_METHOD === "oauth2") {
    return (
      <AuthProvider authConfig={authService}>
        <LoginInfo />
      </AuthProvider>
    );
  } else {
    return <LoginInfo />;
  }
}

export default Oauth2Auth;
