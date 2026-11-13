import type { Id, IsoDate, IsoDateTime } from "./common";

export type StructurePartStatus = "IN_PROGRESS" | "DONE";
/** A 3D part (footing F-3, column G-C4, beam 1-B2, walls G-W, slab G-S …) and its latest mark. */
export interface StructurePartProgress {
  partId: string;
  status: StructurePartStatus;
  date: IsoDate;
  note: string | null;
  markedBy: { id: Id; name: string } | null;
  updatedAt: IsoDateTime;
}
export interface StructureProgress {
  projectId: Id;
  parts: StructurePartProgress[];
  done: number;
  inProgress: number;
}
export interface MarkStructureProgressBody {
  date: IsoDate;
  parts: Array<{ partId: string; status: StructurePartStatus | "NOT_STARTED"; note?: string }>;
}
