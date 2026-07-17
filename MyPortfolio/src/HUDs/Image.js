import UIElement from "./UIElement.js";

export default class UImage extends UIElement {
  imageddx = 0;
  imageddy = 0;

  /** @type { HTMLImageElement } */
  image = null;

  /** @param { HTMLImageElement } image */
  constructor(
    elementName,
    dx,
    dy,
    width,
    height,
    image,
    imageddx,
    imageddy,
    focusable = false,
    backgroundImage = null,
  ) {
    super(elementName, dx, dy, width, height, focusable, backgroundImage);

    this.imageddx = imageddx;
    this.imageddy = imageddy;

    this.image = image;
  }

  setImageDimensions(ddx, ddy, width, height) {
    if (!this.image) return;

    this.imageddx = ddx;
    this.imageddy = ddy;

    this.image.width = width;
    this.image.height = height;
  }

  /** @param { CanvasRenderingContext2D } context2d */
  drawElement(context2d, rootDx, rootDy) {
    const [dx, dy] = super.drawElement(context2d, rootDx, rootDy);

    if (!this.image) {
      context2d.restore();
      return;
    }

    context2d.drawImage(
      this.image,
      0,
      0,
      this.image.naturalWidth,
      this.image.naturalHeight,
      rootDx + dx + this.imageddx,
      rootDy + dy + this.imageddy,
      this.image.width,
      this.image.height,
    );
    context2d.restore();
  }
}
