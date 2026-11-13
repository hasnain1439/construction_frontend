import type { ProjectDetail, ProjectFloors } from "@/api/types";
import { buildHouse, type HouseModel } from "./layout";

/** The 3D model of a project from its setup (plot, structure, foundation, coverage, floors and rooms). */
export function houseOf(project: ProjectDetail, floors: ProjectFloors): HouseModel {
  return buildHouse({
    frontFt: project.plot?.frontFt,
    depthFt: project.plot?.depthFt,
    structureType: project.structure?.structureType,
    foundation: project.foundation,
    coverage: project.coverage,
    floors: floors.floors,
    columnsByLevel: Object.fromEntries((project.calculations?.footprints?.floors ?? []).map((f) => [f.level, f.columns])),
  });
}
