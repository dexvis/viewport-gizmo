import { GizmoOptionsFallback } from "../types";

export const setDomPlacement = (
  domElement: HTMLElement,
  placement: GizmoOptionsFallback["placement"]
) => {
  const [y, x] = placement.split("-");
  Object.assign(domElement.style, {
    left: x === "left" ? "0" : x === "center" ? `50%` : "",
    right: x === "right" ? "0" : "",
    top: y === "top" ? "0" : y === "bottom" ? "" : "50%",
    bottom: y === "bottom" ? "0" : "",
    transform: `${x === "center" ? "translateX(-50%)" : ""} ${
      y === "center" ? "translateY(-50%)" : ""
    }`,
  });

  return placement;
};

export const gizmoDomElement = ({
  placement,
  size,
  offset,
  id,
  className,
}: GizmoOptionsFallback) => {
  const div = document.createElement("div");

  const { top, left, right, bottom } = offset;
  Object.assign(div.style, {
    position: "absolute",
    zIndex: "1000",
    height: `${size}px`,
    width: `${size}px`,
    margin: `${top}px ${right}px ${bottom}px ${left}px`,
    // No border-radius here: the overlay buttons sit in the square's corners.
    touchAction: "none",
  });

  setDomPlacement(div, placement);

  if (id) div.id = id;
  div.className = `dxv-gizmo${className ? " " + className : ""}`;

  return div;
};
