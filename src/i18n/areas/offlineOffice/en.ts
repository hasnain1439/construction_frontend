/** English texts for the offline office settings page: `t("offlineOffice.…")`. */
export const strings = {
  title: "Offline office",
  desc: "An office computer keeps a copy of your company's data, keeps working without internet and syncs with the cloud when the internet is back.",
  notAllowedTitle: "Offline office is not turned on for your company",
  notAllowedBody: "The platform team has to turn it on first. Contact support to ask for it.",
  devicesTitle: "Office computers",
  devicesDesc:
    "Computers that asked to keep a copy of your company's data. Only approved computers can sync.",
  colComputer: "Computer",
  colUser: "Signed in by",
  colRequested: "Requested",
  colApproved: "Approved",
  colLastSync: "Last sync",
  officeComputer: "Office computer",
  waiting: "Waiting for approval",
  approvedBadge: "Approved",
  approve: "Approve",
  revoke: "Revoke",
  approved: "{name} approved — it can sync now",
  revoked: "{name} revoked",
  revokeTitle: "Revoke {name}?",
  revokeBody:
    "This computer stops syncing with the cloud until you approve it again. Nothing is deleted from the cloud.",
  emptyTitle: "No office computer yet",
  emptyBody:
    "To set one up: run the office installer on the office computer, sign in there with an owner or administrator account, then approve the computer here.",
  problemsTitle: "Sync problems",
  problemsDesc:
    "Changes made on this office computer that the cloud did not accept. In each case the cloud version was kept.",
  problemsElsewhere:
    "Sync problems are shown on the office computer itself. Open this page there to see them.",
  problemsEmpty: "No sync problems",
  problemsEmptyBody: "Every change from this office computer reached the cloud.",
  record: "Record",
  cloudKept: "Cloud version kept",
  colField: "Field",
  colOffice: "On this computer",
  colCloud: "In the cloud",
  noDifference: "No field is different.",
  deletedOffice: "Deleted on this computer",
  missingCloud: "Not in the cloud",
  showChanges: "Show changes",
  hideChanges: "Hide changes",
} as const;

export const enums = {
  syncProblemStatus: {
    CONFLICT: "Changed in both places",
    ERROR: "Refused by the cloud",
  },
} as const;
