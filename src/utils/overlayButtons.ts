import { GizmoOptionsFallback } from "../types";

/**
 * CAD-style overlay controls placed in the corners of the gizmo square:
 * two 90°-roll arrows flanking the top and a home button at the bottom left.
 * On mouse devices the buttons appear when the pointer is over the gizmo;
 * on touch devices (no hover) they are always visible.
 */

const STYLE_ID = "dxv-viewport-gizmo-style";

const STYLE = `
.dxv-gizmo .dxv-gizmo-btn {
  position: absolute;
  width: 24px;
  height: 24px;
  padding: 3px;
  border: none;
  border-radius: 50%;
  background: var(--dxv-gizmo-btn-background, rgba(128, 128, 128, 0.2));
  color: var(--dxv-gizmo-btn-color, #808080);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: opacity 0.15s ease, background 0.15s ease;
}
.dxv-gizmo .dxv-gizmo-btn:hover {
  background: var(--dxv-gizmo-btn-hover-background, rgba(128, 128, 128, 0.45));
  color: var(--dxv-gizmo-btn-hover-color, #4d4d4d);
}
.dxv-gizmo .dxv-gizmo-btn svg {
  width: 100%;
  height: 100%;
  display: block;
  pointer-events: none;
}
.dxv-gizmo-roll-ccw { top: 0; left: 0; }
.dxv-gizmo-roll-cw { top: 0; right: 0; }
.dxv-gizmo-home { bottom: 0; left: 0; }
@media (hover: hover) {
  .dxv-gizmo .dxv-gizmo-btn { opacity: 0; pointer-events: none; }
  .dxv-gizmo:hover .dxv-gizmo-btn { opacity: 1; pointer-events: auto; }
}
@media (hover: none) {
  .dxv-gizmo .dxv-gizmo-btn { opacity: 0.7; }
}
`;

// Three-quarter arc with an arrowhead at its end, drawn in the turn direction.
const ROLL_CW_SVG = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <path d="M12 5 A 7 7 0 1 1 5 12" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>
  <path d="M5 5.4 L 8.6 12.6 L 1.4 12.6 Z" fill="currentColor"/>
</svg>`;

const ROLL_CCW_SVG = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <path d="M12 5 A 7 7 0 1 0 19 12" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>
  <path d="M19 5.4 L 22.6 12.6 L 15.4 12.6 Z" fill="currentColor"/>
</svg>`;

const HOME_SVG = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <path d="M12 4 L 20.5 11.5 L 18 11.5 L 18 20 L 13.6 20 L 13.6 14.5 L 10.4 14.5 L 10.4 20 L 6 20 L 6 11.5 L 3.5 11.5 Z" fill="currentColor"/>
</svg>`;

const button = (className: string, title: string, svg: string, onClick: () => void) => {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = `dxv-gizmo-btn ${className}`;
  btn.title = title;
  btn.setAttribute("aria-label", title);
  btn.innerHTML = svg;
  // Keep the press from reaching the gizmo's own pointer handling (drag/click)
  btn.addEventListener("pointerdown", (e) => e.stopPropagation());
  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    onClick();
  });
  return btn;
};

export const overlayButtons = (
  domElement: HTMLElement,
  options: GizmoOptionsFallback,
  handlers: { roll: (direction: 1 | -1) => void; home: () => void }
) => {
  const { roll, home } = options.buttons;
  if (!roll && !home) return;

  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = STYLE;
    document.head.appendChild(style);
  }

  if (roll) {
    domElement.appendChild(
      button("dxv-gizmo-roll-ccw", "Roll view counterclockwise", ROLL_CCW_SVG, () =>
        handlers.roll(-1)
      )
    );
    domElement.appendChild(
      button("dxv-gizmo-roll-cw", "Roll view clockwise", ROLL_CW_SVG, () =>
        handlers.roll(1)
      )
    );
  }

  if (home) {
    domElement.appendChild(
      button("dxv-gizmo-home", "Home view", HOME_SVG, () => handlers.home())
    );
  }
};
