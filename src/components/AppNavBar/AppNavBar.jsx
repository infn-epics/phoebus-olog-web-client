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

import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Stack,
  IconButton,
  List,
  ListItem,
  Badge,
  Box,
  Tooltip
} from "@mui/material";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import LockIcon from "@mui/icons-material/Lock";
import HomeIcon from "@mui/icons-material/Home";
import FilterAltIcon from "@mui/icons-material/FilterAlt";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import { useDispatch } from "react-redux";
import QuotaAdminNavItem from "./QuotaAdminNavItem";
import { InternalButtonLink } from "components/shared/Link";
import { useShowLogin, useShowLogout, useUser } from "features/authSlice";
import LoginDialog from "components/LoginLogout/LoginDialog";
import LogoutDialog from "components/LoginLogout/LogoutDialog";
import SimpleSearch from "components/search/SimpleSearch";
import { SortToggleButton } from "components/search/SortToggleButton";
import { toggleSortOrder } from "features/searchPageParamsReducer";
import { theme } from "src/config/theme";
import { useOnPage } from "src/hooks/onPage";
import { useEnhancedSearchParams } from "src/hooks/useEnhancedSearchParams";

const getFieldCount = (searchParams) => {
  let fieldCount = 0;
  for (const value of Object.values(searchParams)) {
    if (Array.isArray(value) && value.length > 0) {
      fieldCount += value.length;
    } else if (value) {
      fieldCount++;
    }
  }
  return fieldCount;
};

const AppNavBar = ({ advancedSearchOpen, setAdvancedSearchOpen }) => {
  const user = useUser();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { setShowLogin } = useShowLogin();
  const { searchParams } = useEnhancedSearchParams();
  const { setShowLogout } = useShowLogout();
  const { onHomePage, onCreatePage } = useOnPage();

  const toggleSort = () => {
    dispatch(toggleSortOrder());
  };

  if (import.meta.env.VITE_APP_OAUTH2_ENABLED) {
    console.info("[Auth] OAuth2 login mode ENABLED");
  } else {
    console.info("[Auth] Classic username/password login mode ENABLED");
  }

  return (
    <AppBar
      sx={{
        backgroundColor: "background.paper",
        borderBottom: "1px solid",
        borderColor: "divider",
        color: "text.primary"
      }}
      component={"header"}
      position="static"
      elevation={0}
    >
      <Toolbar
        disableGutters
        sx={{
          display: "flex",
          alignItems: "center",
          gap: { xs: 1, md: 2.5 },
          px: { xs: 1.5, md: 3, xl: 5 },
          py: { xs: 1, md: 0.75 },
          minHeight: 68,
          flexWrap: "wrap",
          [theme.breakpoints.down("md")]: {
            minHeight: 64,
            rowGap: 0.75
          }
        }}
      >
        <Button
          component={RouterLink}
          onClick={() => {
            setAdvancedSearchOpen(false);
            const searchResultList = document.getElementById("searchResultList");
            if (searchResultList) {
              searchResultList.scrollTo({ top: 0, behavior: "smooth" });
            }
          }}
          to="/"
          color="inherit"
          sx={{
            order: 1,
            flex: "0 0 auto",
            minWidth: 0,
            px: 0,
            mr: { xs: "auto", md: 0 },
            color: "text.primary",
            "&:hover": { backgroundColor: "transparent", color: "primary.dark" }
          }}
        >
          <HomeIcon sx={{ color: "primary.main", fontSize: 23 }} titleAccess="home" />
          <Typography ml={1} fontSize="1.15rem" fontWeight={700} letterSpacing="-0.025em" component="span">
            {import.meta.env.VITE_APP_LOGBOOK_NAME || "Olog"}
          </Typography>
        </Button>
        {onHomePage && (
          <Box
            component="nav"
            aria-label="Search controls"
            sx={{
              flex: "1 1 420px",
              minWidth: 0,
              order: { xs: 3, md: 2 },
              width: { xs: "100%", md: "auto" },
              maxWidth: { md: 670 }
            }}
          >
            <Stack
              flexDirection="row"
              alignItems="center"
              sx={{
                width: "100%",
                minWidth: 0,
              }}
            >
              <SimpleSearch />
              <Box sx={{ display: "flex", alignItems: "center", flex: "0 0 auto", pl: 0.5 }}>
                <IconButton
                  aria-label="Advanced filters"
                  sx={{
                    color: advancedSearchOpen ? "primary.dark" : "text.secondary",
                    backgroundColor: advancedSearchOpen ? "primary.light" : "transparent",
                    "&:hover": { backgroundColor: "primary.light" },
                    "&:focus-visible": { outline: "2px solid", outlineColor: "primary.main" }
                  }}
                  onClick={() => setAdvancedSearchOpen((prev) => !prev)}
                >
                  <Tooltip title="Advanced filters">
                    <Badge badgeContent={getFieldCount(searchParams)} color="primary">
                      <FilterAltIcon />
                    </Badge>
                  </Tooltip>
                </IconButton>
                  <SortToggleButton
                    label="create date"
                    onClick={toggleSort}
                  />
              </Box>
            </Stack>
          </Box>
        )}
        <Stack
          flexDirection="row"
          justifyContent="flex-end"
          alignItems="center"
          sx={{
            flex: "1 1 auto",
            minWidth: 0,
            boxSizing: "border-box",
            flexWrap: "wrap",
            gap: 1,
            order: { xs: 2, md: 3 },
            "& nav > ul": { gap: { xs: 0.5, md: 1 } }
          }}
        >
          <nav aria-label="user menu" style={{ minWidth: 0, maxWidth: "100%" }}>
            <List
              sx={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                "& > li": { width: "auto" },
                padding: "0",
                gap: "10px"
              }}
            >
              <List
                aria-label="help menu"
                sx={{
                  display: "flex"
                }}
              >
                <ListItem sx={{ padding: 0 }}>
                  <Tooltip title="Help">
                    <IconButton onClick={() => navigate("/help")}>
                      <HelpOutlineIcon
                        color="primary"
                        titleAccess="help"
                        sx={{ fontSize: "25px" }}
                      />
                    </IconButton>
                  </Tooltip>
                </ListItem>
              </List>
              {user && !onCreatePage ? (
                <ListItem sx={{ padding: 0 }}>
                  <InternalButtonLink
                    to="/logs/create"
                    variant="contained"
                    color="primary"
                    sx={{
                      fontWeight: onCreatePage ? 400 : 600,
                      minWidth: "100px",
                      padding: "6px 15px",
                      fontSize: "0.8rem",
                      boxShadow: "none"
                    }}
                  >
                    New entry
                  </InternalButtonLink>
                </ListItem>
              ) : null}

              <ListItem sx={{ padding: 0 }}>
                <InternalButtonLink
                  to="/logbooks"
                  variant="outlined"
                  color="primary"
                  sx={{
                    minWidth: "100px",
                    padding: "6px 15px",
                    fontSize: "0.8rem",
                    boxShadow: "none"
                  }}
                >
                  Logbooks
                </InternalButtonLink>
              </ListItem>

              <QuotaAdminNavItem />

              <ListItem sx={{ padding: "0 0 0 8px", minWidth: 0, maxWidth: "100%", boxSizing: "border-box" }}>
                {user?.userName ? (
                  <Tooltip title={user.userName}>
                    <Button
                      onClick={() => setShowLogout(true)}
                      variant="outlined"
                      color="primary"
                      aria-label={user.userName}
                      sx={{ minWidth: 0, maxWidth: { xs: "160px", lg: "200px" } }}
                    >
                      <Box component="span" sx={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {user.userName}
                      </Box>
                    </Button>
                  </Tooltip>
                ) : (
                  <Button
                    onClick={() => setShowLogin(true)}
                    variant="outlined"
                    color="inherit"
                    startIcon={<LockIcon />}
                  >
                    Sign In
                  </Button>
                )}
              </ListItem>
            </List>
          </nav>
        </Stack>
      </Toolbar>
      <LoginDialog />
      <LogoutDialog />
    </AppBar>
  );
};
export default AppNavBar;
