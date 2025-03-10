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

import { Outlet } from "react-router-dom";
import { Box, Stack } from "@mui/material";
import {
  AuthProvider,
  AuthContext,
  TAuthConfig,
  TRefreshTokenExpiredEvent
} from "react-oauth2-code-pkce";
import { Banner } from "../components/Banner";
import Initialize from "../components/Initialize";
import { useContext } from "react";
import { AuthDataProvider, useAuthData } from "src/auth/authContext";

const authConfig = {
  clientId: "camunda",
  authorizationEndpoint:
    "https://idp-test.app.infn.it/auth/realms/aai/protocol/openid-connect/auth",
  tokenEndpoint:
    "https://idp-test.app.infn.it/auth/realms/aai/protocol/openid-connect/token",
  redirectUri: "http://localhost:3000/",
  scope: "openid",
  onRefreshTokenExpire: (event) => event.logIn(undefined, undefined, "popup")
};


function LoginInfo() {
  const { token, tokenData, logIn, logOut } = useAuthData();

  if (!token) {
    return (
      <>
        <div>You are not logged in.</div>
        <button onClick={logIn}>Log in</button>
      </>
    );
  }

  return (
    <>
      <p>logged</p>
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
const App = () => {
  return (
    <Stack
      id="app-viewport"
      height="100vh"
    >
      <Initialize>
        <AuthProvider authConfig={authConfig}>
          <AuthDataProvider>
            <LoginInfo />
            <Banner />
            <Box
              id="app-content"
              sx={{
                overflow: "auto",
                height: "100%",
                padding: 1
              }}
            >
              <Outlet />
            </Box>
          </AuthDataProvider>
        </AuthProvider>
      </Initialize>
    </Stack>
  );
};

export default App;
