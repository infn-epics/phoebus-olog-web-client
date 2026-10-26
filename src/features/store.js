import { configureStore } from "@reduxjs/toolkit";
import userSliceReducer from "./authSlice";
import advancedSearchReducer from "./advancedSearchReducer";
import searchPageParamsReducer from "features/searchPageParamsReducer";
import { ologApi } from "api/ologApi";
import { godivaApi } from "api/godivaApi";
import { identityApi } from "api/identityApi";

export const setupStore = (preloadedState) => {
  const clearSessionCache = (store) => (next) => (action) => {
    const previousUser = store.getState().auth.user?.uuid;
    const result = next(action);
    if (previousUser !== store.getState().auth.user?.uuid) {
      store.dispatch(ologApi.util.resetApiState());
      store.dispatch(identityApi.util.resetApiState());
      store.dispatch(godivaApi.util.resetApiState());
    }
    return result;
  };
  return configureStore({
    reducer: {
      searchPageParams: searchPageParamsReducer,
      advancedSearch: advancedSearchReducer,
      [ologApi.reducerPath]: ologApi.reducer,
      [identityApi.reducerPath]: identityApi.reducer,
      [godivaApi.reducerPath]: godivaApi.reducer,
      auth: userSliceReducer
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(clearSessionCache, ologApi.middleware, identityApi.middleware, godivaApi.middleware),
    preloadedState
  });
};

export const store = setupStore({});
