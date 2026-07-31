import { GizmoAxisObject, GizmoOptionsFallback } from "../types";
import {
  Mesh,
  MeshBasicMaterial,
  Vector3,
} from "three";
import { roundedRectangleGeometry } from "./roundedRectangleGeometry";

export const axesCorners = (
  options: GizmoOptionsFallback
): GizmoAxisObject[] => {
  const { corners } = options;

  if (!corners.enabled) return [];

  const { color, opacity, scale, radius, smoothness, hover } = corners;

  const geometry = roundedRectangleGeometry(radius, smoothness);

  const positionOffsetRatio = 0.85;
  const positions = [
    1, 1, 1, -1, 1, 1, 1, -1, 1, -1, -1, 1, 1, 1, -1, -1, 1, -1, 1, -1, -1, -1,
    -1, -1,
  ].map((val) => val * positionOffsetRatio);

  const target = new Vector3();
  return Array(positions.length / 3)
    .fill(0)
    .map<GizmoAxisObject>((_, i) => {
      const corner = new Mesh(
        geometry,
        new MeshBasicMaterial({ color, transparent: true, opacity })
      );

      const i3 = i * 3;
      corner.position.set(positions[i3], positions[i3 + 1], positions[i3 + 2]);

      corner.scale.setScalar(scale);
      corner.lookAt(target.copy(corner.position).multiplyScalar(2));
      corner.renderOrder = 1;

      corner.userData = {
        color,
        opacity,
        scale,
        hover,
        // Corners win ties against faces/edges when raycast hits land at
        // nearly the same depth (see intersectedObjects).
        intersectionOrder: 1,
      };

      return corner;
    });
};
