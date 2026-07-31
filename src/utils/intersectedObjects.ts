import { GizmoAxisObject } from "../types";
import {
  Vector2,
  Raycaster,
  type Object3D,
  type Camera,
  Intersection,
} from "three";

const _raycaster = /*@__PURE__*/ new Raycaster();
const _mouse = /*@__PURE__*/ new Vector2();

export const intersectedObjects = (
  event: PointerEvent,
  domRect: DOMRect,
  camera: Camera,
  intersections: Object3D[]
): Intersection<GizmoAxisObject> | null => {
  _mouse.set(
    ((event.clientX - domRect.left) / domRect.width) * 2 - 1,
    -((event.clientY - domRect.top) / domRect.height) * 2 + 1
  );

  _raycaster.setFromCamera(_mouse, camera);

  const intersects = _raycaster.intersectObjects<GizmoAxisObject>(
    intersections,
    false
  );

  // Sort by distance (occlusion), but let objects with a higher
  // `intersectionOrder` win ties among hits at nearly the same depth —
  // corners overlap face borders and must stay clickable.
  if (intersects.length > 0) {
    intersects.sort((a, b) => a.distance - b.distance);

    const DISTANCE_THRESHOLD = 0.2;
    const closestDistance = intersects[0].distance;

    const nearHits = intersects.filter(
      (hit) => hit.distance <= closestDistance + DISTANCE_THRESHOLD
    );

    if (nearHits.length > 1) {
      nearHits.sort(
        (a, b) =>
          (b.object.userData.intersectionOrder || 0) -
          (a.object.userData.intersectionOrder || 0)
      );

      intersects.splice(0, nearHits.length, ...nearHits);
    }
  }

  const intersection = intersects.length ? intersects[0] : null;

  return !intersection || !intersection.object.visible ? null : intersection;
};
