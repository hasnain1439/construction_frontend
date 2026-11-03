/**
 * Self-service company signup is off in the Windows desktop app (NEXT_PUBLIC_SIGNUP_DISABLED=1, baked
 * in by its website build): its one company comes from the app's setup screen and the API refuses
 * /auth/signup there (SIGNUP_DISABLED).
 */
export const SIGNUP_ENABLED = process.env.NEXT_PUBLIC_SIGNUP_DISABLED !== "1";
