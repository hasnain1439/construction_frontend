import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { loggedOut, sessionExpired } from "@/store/sessionEvents";

/** Which project the project-mode shell is showing. Project data itself lives in RTK Query. */
export interface ProjectState {
  currentProjectId: string | null;
}

const initialState: ProjectState = { currentProjectId: null };

export const projectSlice = createSlice({
  name: "project",
  initialState,
  reducers: {
    setCurrentProject(state, action: PayloadAction<string | null>) {
      state.currentProjectId = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(sessionExpired, () => initialState).addCase(loggedOut, () => initialState);
  },
});

export const { setCurrentProject } = projectSlice.actions;
export default projectSlice.reducer;
