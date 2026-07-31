import { GizmoOptionsFallback, GizmoAxisObject } from "../types";
import { axesMap } from "./axesMap";
import { axesFaces } from "./axesFaces";
import { axesCorners } from "./axesCorners";
import { axesEdges } from "./axesEdges";
import { gizmoBackground } from "./gizmoBackground";

export const axesObjects = (options: GizmoOptionsFallback) => {
  const axes: GizmoAxisObject[] = [];
  const map = axesMap(options);

  const faces = axesFaces(options, map);

  axes.push(...faces);
  axes.push(...axesCorners(options));
  axes.push(...axesEdges(options));

  const background = gizmoBackground(faces, options);

  return [axes, background] as const;
};
