import { GizmoAxisObject, GizmoOptionsFallback } from "../types";
import { roundedRectangleGeometry } from "./roundedRectangleGeometry";
import {
  CanvasTexture,
  Mesh,
  MeshBasicMaterial,
  MeshBasicMaterialParameters,
  Vector3,
} from "three";
import { GIZMO_AXES } from "./constants";
import { setMapColumnOffset } from "./axesMap";
import { faceQuaternion } from "../orientation";

export const axesFaces = (
  options: GizmoOptionsFallback,
  texture: CanvasTexture
): GizmoAxisObject[] => {
  const normal = new Vector3();
  const { radius, smoothness, poleUp } = options;
  const geometry = roundedRectangleGeometry(radius, smoothness, 2, 2);

  return GIZMO_AXES.map((_, i) => {
    const isPositive = i < 3;

    const axis = GIZMO_AXES[i];
    const map = i ? texture.clone() : texture;

    setMapColumnOffset(map, i);

    const { enabled, scale, opacity, hover } = options[axis];

    const face: GizmoAxisObject = new Mesh(
      geometry,
      new MeshBasicMaterial({
        map,
        opacity,
        transparent: true,
      } satisfies MeshBasicMaterialParameters)
    );

    const direction = (isPositive ? axis : axis[1]) as "x" | "y" | "z";
    face.position[direction] = isPositive ? 1 : -1;

    // Orient the face so its label reads upright when the camera arrives at
    // this face's view — one rule for all six faces, poleUp included.
    normal.copy(face.position).normalize();
    faceQuaternion(normal, poleUp, face.quaternion);

    face.scale.setScalar(scale);
    face.renderOrder = 1;
    face.visible = enabled;
    face.userData = {
      scale,
      opacity,
      hover,
    };

    return face;
  });
};
