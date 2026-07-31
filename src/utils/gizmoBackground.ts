import { GizmoAxisObject, GizmoOptionsFallback } from "../types";
import { BackSide, BufferGeometry, Mesh, MeshBasicMaterial } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/**
 * The cube background: the six face planes merged into one slightly smaller
 * back-side shell, so the cube reads as a solid from every angle.
 */
export const gizmoBackground = (
  faces: GizmoAxisObject[],
  options: GizmoOptionsFallback
) => {
  const {
    background: { enabled, color, opacity, hover },
  } = options;

  if (!enabled) return null;

  const material = new MeshBasicMaterial({
    color,
    side: BackSide,
    opacity: opacity,
    transparent: true,
    depthWrite: false,
  });

  let geometry!: BufferGeometry;

  faces.forEach((plane) => {
    const originalScale = plane.scale.x;
    plane.scale.setScalar(0.9);
    plane.updateMatrix();

    const planeGeometry = plane.geometry.clone();
    planeGeometry.applyMatrix4(plane.matrix);

    geometry = geometry
      ? mergeGeometries([geometry, planeGeometry])
      : planeGeometry;

    plane.scale.setScalar(originalScale);
  });

  const background = new Mesh(geometry, material);

  background.userData = {
    color,
    opacity,
    hover,
  };

  return background;
};
