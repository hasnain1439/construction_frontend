import { createAction } from "@reduxjs/toolkit";

/**
 * Cross-cutting session events. Kept in their own module so the API layer can dispatch
 * them without importing the slices (which import the API layer).
 */
export const sessionExpired = createAction<{ audience: "company" | "platform" }>("session/expired");
export const loggedOut = createAction<{ audience: "company" | "platform" }>("session/loggedOut");
