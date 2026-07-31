import { GizmoOptionsFallback, GizmoAxisObject } from "../types";
import {
  Mesh,
  MeshBasicMaterial,
  Vector3,
} from "three";
import { roundedRectangleGeometry } from "./roundedRectangleGeometry";

export const axesEdges = (options: GizmoOptionsFallback): GizmoAxisObject[] => {
  const { edges } = options;

  if (!edges.enabled) return [];

  const { color, opacity, scale, hover, radius, smoothness } = edges;

  const geometry = roundedRectangleGeometry(radius, smoothness, 1.2, 0.25);

  const positionOffsetRatio = 0.925;
  const positions = [
    0, 1, 1, 0, -1, 1, 1, 0, 1, -1, 0, 1, 0, 1, -1, 0, -1, -1, 1, 0, -1, -1, 0,
    -1, 1, 1, 0, 1, -1, 0, -1, 1, 0, -1, -1, 0,
  ].map((val) => val * positionOffsetRatio);

  const target = new Vector3();
  const defaultUp = new Vector3(0, 1, 0);
  return Array(positions.length / 3)
    .fill(0)
    .map<GizmoAxisObject>((_, i) => {
      const edge = new Mesh(
        geometry,
        new MeshBasicMaterial({ color, transparent: true, opacity })
      );

      const i3 = i * 3;
      edge.position.set(positions[i3], positions[i3 + 1], positions[i3 + 2]);
      edge.scale.setScalar(scale);

      edge.up.copy(defaultUp);
      edge.lookAt(target.copy(edge.position).multiplyScalar(2));
      if (!edge.position.y) edge.rotation.z = Math.PI / 2;

      edge.renderOrder = 1;

      edge.userData = {
        color,
        opacity,
        scale,
        hover,
      };

      return edge;
    });
};
