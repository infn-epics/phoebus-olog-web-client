/**
 * Copyright (C) 2020 European Spallation Source ERIC.
 * <p>
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU General Public License
 * as published by the Free Software Foundation; either version 2
 * of the License, or (at your option) any later version.
 * <p>
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 * <p>
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software
 * Foundation, Inc., 59 Temple Place - Suite 330, Boston, MA  02111-1307, USA.
 */

import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Box, styled } from "@mui/material";
import { AuthProvider } from "react-oauth2-code-pkce";
import Initialize from "../components/Initialize";
import { AuthDataProvider, useAuthData } from "src/auth/authContext";
import { AppNavBar } from "src/components/AppNavBar";
import { AdvancedSearchDrawer } from "components/search/AdvancedSearchDrawer.jsx";
import { onHomePage } from "hooks/isHomePage.js";
import { theme } from "src/config/theme";

if (import.meta.env.VITE_APP_OAUTH2_ENABLED) {
  console.info("[Auth] OAuth2 login mode ENABLED");
} else {
  console.info("[Auth] Classic username/password login mode ENABLED");
}

const authConfig = {
  clientId: import.meta.env.VITE_AUTH_CLIENT_ID,
  authorizationEndpoint: import.meta.env.VITE_AUTH_ENDPOINT,
  tokenEndpoint: import.meta.env.VITE_AUTH_ENDPOINT_TOKEN,
  redirectUri: import.meta.env.VITE_AUTH_ENDPOINT_REDIRECT_URI,
  scope: import.meta.env.VITE_AUTH_SCOPE,
  tokenExpiresIn: 3600,
  logoutEndpoint:
    import.meta.env.VITE_AUTH_ENDPOINT_LOGOUT +
    "?redirect_uri=" +
    import.meta.env.VITE_AUTH_ENDPOINT_REDIRECT_URI,
  onRefreshTokenExpire: (event) => event.logIn(undefined, undefined, "redirect")
};

const Overlay = styled("div")(({ theme }) => ({
  [theme.breakpoints.down("md")]: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    zIndex: 2
  }
}));

function LoginInfo() {
  const { token, tokenData, logIn, logOut } = useAuthData();

  if (!token) {
    return (
      <>
        {/*<div>You are not logged in.</div>*/}
        {/*<button onClick={logIn}>Log in</button>*/}
      </>
    );
  }

  return (
    <>
      {/*<p>logged</p>*/}
      {/*<div>*/}
      {/*  <h4>Access Token (JWT)given_name</h4>*/}
      {/*  <pre>{token}</pre>*/}
      {/*</div>*/}
      {/*<div>*/}
      {/*  <h4>Decoded Token Data</h4>*/}
      {/*  <pre>{JSON.stringify(tokenData, null, 2)}</pre>*/}
      {/*</div>*/}
      {/*<button onClick={logOut}>Log out</button>*/}
    </>
  );
}

/**
 * Entry point component.
 */
const App = styled(({ className }) => {
  const { pathname } = useLocation();
  const [advancedSearchOpen, setAdvancedSearchOpen] = useState(false);

  return (
    <Initialize>
      <AuthProvider authConfig={authConfig}>
        <AuthDataProvider>
          <LoginInfo />
          {advancedSearchOpen && (
            <Overlay onClick={() => setAdvancedSearchOpen(false)} />
          )}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: onHomePage(pathname) ? "auto 2fr" : null,
              gridTemplateRows: "1fr",
              height: "100vh",
              overflow: "auto",
              transition: ""
            }}
          >
            {onHomePage(pathname) && (
              <AdvancedSearchDrawer advancedSearchOpen={advancedSearchOpen} />
            )}
            <Box
              className={className}
              sx={{
                display: "flex",
                flexFlow: "column",
                height: "100vh",
                overflow: "auto",
                [theme.breakpoints.down("md")]: {
                  width: "auto",
                  height: "auto"
                }
              }}
            >
              <AppNavBar
                advancedSearchOpen={advancedSearchOpen}
                setAdvancedSearchOpen={setAdvancedSearchOpen}
              />
              <Outlet />
            </Box>
          </Box>
        </AuthDataProvider>
      </AuthProvider>
    </Initialize>
  );

  // return (
  //   <Stack
  //     id="app-viewport"
  //     height="100vh"
  //   >
  //     <Initialize>
  //       <AuthProvider authConfig={authConfig}>
  //         <AuthDataProvider>
  //           <LoginInfo />
  //           <Box
  //             id="app-content"
  //             sx={{
  //               overflow: "auto",
  //               height: "100%",
  //               padding: 1
  //             }}
  //           >
  //             <Outlet />
  //           </Box>
  //         </AuthDataProvider>
  //       </AuthProvider>
  //     </Initialize>
  //   </Stack>
  // );
})({
  "& > *": {
    minHeight: 0
  }
});

export default App;
