import UIElement from "./UIElement.js";

export default class Block extends UIElement {
  rgba = null;

  constructor(
    elementName,
    dx,
    dy,
    width,
    height,
    rgba,
    focusable = false,
    backgroundImage = null,
  ) {
    super(elementName, dx, dy, width, height, focusable, backgroundImage);
    this.rgba = !rgba ? "rgba(255,255,255,1)" : rgba;
  }

  /** @param { CanvasRenderingContext2D } context2d */
  drawElement(context2d, rootDx, rootDy) {
    const [dx, dy] = super.drawElement(context2d, rootDx, rootDy);

    context2d.fillStyle = this.rgba;
    context2d.fillRect(rootDx + dx, rootDy + dy, this.width, this.height);

    context2d.restore();
  }

  //for its children
  drawElementFromUIElementClass(context2d, rootDx, rootDy) {
    const [dx, dy] = super.drawElement(context2d, rootDx, rootDy);
    return [dx, dy];
  }
}
