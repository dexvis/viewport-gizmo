# @dexvis/viewport-gizmo

Interactive camera-orientation cube for three.js viewports. Click a face, edge
or corner to animate the camera to that view, drag the cube to orbit, roll the
view in 90° steps, or jump to a configurable home view.

This package is a fork of
[three-viewport-gizmo](https://github.com/Fennec-hub/three-viewport-gizmo)
(MIT, © Fennec), forked at upstream commit `d1e74cb` (v2.2.0). See
[Why a fork](#why-a-fork-and-not-the-npm-package) before reaching for the
upstream package.

## Usage

```ts
import { ViewportGizmo } from "@dexvis/viewport-gizmo";

const gizmo = new ViewportGizmo(camera, renderer, {
  container: viewportElement,
  size: 90,
});
gizmo.attachControls(orbitControls);

// In the render loop, after rendering the main scene:
gizmo.render();
```

The gizmo works with `WebGLRenderer` and `WebGPURenderer`.

### Axis conventions

The world up axis is +Y. Views that look along ±Y (Top/Bottom) have no natural
screen-up — the projection of world up onto the screen vanishes — so their roll
comes from the `poleUp` option instead of a floating-point accident:

```ts
// Accelerator-experiment (HENP) convention: beam along Z, X toward the ring
// center. Front view: Y up, Z right, X into the screen. Top view: Z right,
// X toward the top of the screen.
new ViewportGizmo(camera, renderer, {
  poleUp: { top: [1, 0, 0], bottom: [-1, 0, 0] },
  // Faces are keyed by axis; assign labels to match the convention:
  nx: { label: "Front" },
  x: { label: "Back" },
  z: { label: "Right" },
  nz: { label: "Left" },
  y: { label: "Top" },
  ny: { label: "Bottom" },
});
```

The default `poleUp` is the "tumble" convention: the roll reached by rotating
the front (+Z) view over the cube's top or bottom edge (`top: [0, 0, -1]`,
`bottom: [0, 0, 1]`).

The same rule orients the Top/Bottom face labels, so the label text always
reads upright when the camera arrives at the face.

### Roll, home, and programmatic views

```ts
gizmo.roll(1);   // roll the image 90° clockwise (also: the curved arrow buttons)
gizmo.roll(-1);  // counterclockwise
gizmo.home();    // fires the "home" event and, if homeView is set, animates there
gizmo.view({ direction: [0, 1, 0] });            // top view, up resolved via poleUp
gizmo.view({ direction: [0, 0, 1], up: [1, 0, 0] }); // explicit screen-up
```

Overlay buttons (two curved roll arrows and a home button) sit in the corners
of the gizmo square. On mouse devices they appear when the pointer hovers the
gizmo; on touch devices they are always visible. Disable them with
`buttons: { roll: false, home: false }`. Style them with the CSS variables
`--dxv-gizmo-btn-background`, `--dxv-gizmo-btn-color` and their `-hover-`
variants.

After a pole view or a roll, the camera `up` vector changes and attached
`OrbitControls` are refreshed to orbit around the new up, so dragging in a Top
view orbits around the screen-vertical axis instead of jumping.

### Events

`start`, `change`, `end` (view interactions), `home`, and
`roll` (`{ direction: 1 | -1 }`).

## Why a fork, and not the npm package

The upstream library is good, but four of its problems sit in code paths that
cannot be fixed from the outside, and consuming it as a dependency forced its
users into monkey-patching private methods (`domUpdate`, `render`,
`_setOrientation`) that break on every upstream refactor:

1. **Undefined roll at the poles.** Upstream orients pole views with
   `Matrix4.lookAt` and a parallel up vector; the epsilon fallback inside
   lookAt then picks an arbitrary roll ("Top" arrives with Z pointing down).
   Later upstream versions special-case Z-up and X-up worlds via
   `Object3D.DEFAULT_UP` quirks, but the roll is still not configurable — and
   HENP conventions need exactly that. This fork replaces the machinery with
   explicit per-view orientation frames (`poleUp`, `view()`), which also
   orient the face labels consistently.
2. **WebGPU viewport origin.** Upstream computes the gizmo viewport with
   WebGL's bottom-left origin; under `WebGPURenderer` (top-left origin) the
   gizmo renders displaced. Fixed in `domUpdate`.
3. **WebGPU in-pass clear.** Upstream calls `renderer.clear()` between
   `setViewport` and `render`; `WebGPURenderer` runs that clear as its own
   render pass, desyncing viewport state (visible as a "doubled" cube). Fixed
   by clearing depth in-pass via the `autoClear` flags (same approach as
   upstream draft PR #54).
4. **No view controls.** CAD-style roll arrows and a home button belong to the
   gizmo (the cube is the camera control), not to a separate UI panel.

The fork is also deliberately smaller and meant to be modified: only the cube
skin is kept (sphere and rounded-cube are removed along with their branches),
orientation math lives in pure functions (`src/orientation.ts`) with unit
tests, and behavior that experiments may want to change — pole roll, labels,
home view, buttons — is configuration, not patching.

## Development

```bash
npm install
npm test        # vitest
npm run build   # tsup -> dist/
```

## License

MIT. Original code © 2024 Fennec (three-viewport-gizmo); modifications
© 2026 dexvis contributors. See [LICENSE](./LICENSE).
