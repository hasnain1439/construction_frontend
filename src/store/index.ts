import { combineReducers, configureStore } from "@reduxjs/toolkit";
import { setupListeners } from "@reduxjs/toolkit/query";
import { adminBaseApi } from "@/api/adminBaseApi";
import { baseApi } from "@/api/baseApi";
import { errorListener } from "@/store/errorListener";
import authReducer from "@/store/slices/authSlice";
import projectReducer from "@/store/slices/projectSlice";
import uiReducer from "@/store/slices/uiSlice";

export const rootReducer = combineReducers({
  auth: authReducer,
  ui: uiReducer,
  project: projectReducer,
  [baseApi.reducerPath]: baseApi.reducer,
  [adminBaseApi.reducerPath]: adminBaseApi.reducer,
});

export type RootState = ReturnType<typeof rootReducer>;

/** One store per browser tab (created in StoreProvider), never shared across requests. */
export function makeStore(preloadedState?: Partial<RootState>) {
  const store = configureStore({
    reducer: rootReducer,
    preloadedState,
    middleware: (getDefault) =>
      getDefault()
        .prepend(errorListener.middleware)
        .concat(baseApi.middleware, adminBaseApi.middleware),
  });
  setupListeners(store.dispatch);
  return store;
}

export type AppStore = ReturnType<typeof makeStore>;
export type AppDispatch = AppStore["dispatch"];
