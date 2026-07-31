import { Matrix4, Quaternion, Vector3 } from "three";
import type { GizmoOptionsFallback } from "./types";

/**
 * View-orientation math for the gizmo.
 *
 * The world up axis is +Y (the three.js default). Every view is described by a
 * unit `direction` (from the orbit target to the camera) plus a screen-up
 * vector. For side views screen-up is world up; for the two pole views
 * (direction along ±Y) the projection of world up onto the screen vanishes, so
 * screen-up comes from the `poleUp` configuration instead of the degenerate
 * `Matrix4.lookAt` epsilon fallback (which lands with an arbitrary roll — the
 * upstream library's "Top view with Z pointing down" bug).
 */

const POLE_THRESHOLD = 0.999;

const _right = /*@__PURE__*/ new Vector3();
const _trueUp = /*@__PURE__*/ new Vector3();
const _matrix = /*@__PURE__*/ new Matrix4();

export const WORLD_UP = /*@__PURE__*/ new Vector3(0, 1, 0);

/**
 * Resolves the screen-up vector for a view direction.
 *
 * @param direction - Unit vector from the target to the camera
 * @param poleUp - Configured screen-up vectors for the two pole views
 * @param out - Vector to write the result into
 */
export function resolveViewUp(
  direction: Vector3,
  poleUp: GizmoOptionsFallback["poleUp"],
  out: Vector3
): Vector3 {
  if (direction.y > POLE_THRESHOLD) return out.fromArray(poleUp.top);
  if (direction.y < -POLE_THRESHOLD) return out.fromArray(poleUp.bottom);
  return out.copy(WORLD_UP);
}

/**
 * Builds the camera orientation for a view, given the direction from the
 * target to the camera and the screen-up vector. The camera local axes map to
 * (screen-right, screen-up, direction); `up` is re-orthogonalized against
 * `direction`, so a world-up `up` works for tilted (edge/corner) directions.
 *
 * Never degenerates as long as `up` is not parallel to `direction` —
 * {@link resolveViewUp} guarantees that for every clickable gizmo position.
 *
 * @param direction - Unit vector from the target to the camera
 * @param up - Requested screen-up vector
 * @param out - Quaternion to write the result into
 */
export function viewQuaternion(
  direction: Vector3,
  up: Vector3,
  out: Quaternion
): Quaternion {
  _right.crossVectors(up, direction).normalize();
  _trueUp.crossVectors(direction, _right);
  _matrix.makeBasis(_right, _trueUp, direction);
  return out.setFromRotationMatrix(_matrix);
}

/**
 * Builds the orientation of a cube-face plane so its label reads upright when
 * the camera arrives at that face's view: the plane's local X (text run
 * direction) maps to that view's screen-right and local Y to screen-up.
 * Uses the same up-resolution rule as the camera, so labels and camera roll
 * always agree — including on the Top/Bottom faces via `poleUp`.
 *
 * @param normal - Outward unit normal of the face (also the view direction)
 * @param poleUp - Configured screen-up vectors for the two pole views
 * @param out - Quaternion to write the result into
 */
export function faceQuaternion(
  normal: Vector3,
  poleUp: GizmoOptionsFallback["poleUp"],
  out: Quaternion
): Quaternion {
  const up = resolveViewUp(normal, poleUp, _trueUp);
  return viewQuaternion(normal, up, out);
}
