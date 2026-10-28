import type { Widen } from "../../types";
import type * as En from "./en";

export const strings: Widen<typeof En.strings> = {
  title: "Offline daftar",
  desc: "Daftar ka computer company ke data ki copy rakhta hai, internet ke baghair kaam karta hai aur internet wapas aane par cloud se sync ho jata hai.",
  notAllowedTitle: "Aap ki company ke liye offline daftar chalu nahi hai",
  notAllowedBody: "Pehle platform team ise chalu karegi. Iske liye support se rabta karein.",
  devicesTitle: "Daftar ke computer",
  devicesDesc:
    "Woh computer jinhon ne company ke data ki copy rakhne ki darkhwast ki. Sirf manzoor shuda computer sync kar sakte hain.",
  colComputer: "Computer",
  colUser: "Kis ne sign in kiya",
  colRequested: "Darkhwast",
  colApproved: "Manzoori",
  colLastSync: "Aakhri sync",
  officeComputer: "Daftar ka computer",
  waiting: "Manzoori ka intezar",
  approvedBadge: "Manzoor",
  approve: "Manzoor karein",
  revoke: "Manzoori wapas lein",
  approved: "{name} manzoor — ab yeh sync kar sakta hai",
  revoked: "{name} ki manzoori wapas le li",
  revokeTitle: "{name} ki manzoori wapas lein?",
  revokeBody: "Yeh computer dobara manzoori tak cloud se sync nahi karega. Cloud se kuch nahi mitaya jata.",
  emptyTitle: "Abhi koi daftar ka computer nahi",
  emptyBody:
    "Set up ka tareeqa: daftar ke computer par office installer chalayein, wahan owner ya administrator account se sign in karein, phir yahan us computer ko manzoor karein.",
  problemsTitle: "Sync ke masail",
  problemsDesc:
    "Is daftar ke computer par ki gayi tabdeeliyan jo cloud ne qabool nahi kin. Har surat mein cloud wala version rakha gaya.",
  problemsElsewhere:
    "Sync ke masail sirf daftar ke computer par nazar aate hain. Unhein dekhne ke liye yeh page wahan kholein.",
  problemsEmpty: "Sync ka koi masla nahi",
  problemsEmptyBody: "Is daftar ke computer ki har tabdeeli cloud tak pohanch gayi.",
  record: "Record",
  cloudKept: "Cloud wala version rakha gaya",
  colField: "Khana",
  colOffice: "Is computer par",
  colCloud: "Cloud mein",
  noDifference: "Koi khana mukhtalif nahi.",
  deletedOffice: "Is computer par mita diya gaya",
  missingCloud: "Cloud mein mojood nahi",
  showChanges: "Tabdeeliyan dekhein",
  hideChanges: "Tabdeeliyan chhupayein",
};

export const enums: Widen<typeof En.enums> = {
  syncProblemStatus: {
    CONFLICT: "Dono jagah tabdeel hua",
    ERROR: "Cloud ne inkaar kiya",
  },
};
