export default class UIElement {
  elementName = null;

  dx = 0;
  dy = 0;
  width = 0;
  height = 0;

  opacity = 1;

  /** @type {HTMLImageElement} */
  backgroundImage = null;

  focusable = false;
  isFocused = false;

  active = true;

  flipHorizontal = false;
  flipVertical = false;

  onPointerEnter = () => {};
  onPointerLeave = () => {};
  onClick = () => {};

  /** @param {HTMLImageElement} backgroundImage */
  constructor(
    elementName,
    dx,
    dy,
    width,
    height,
    focusable = false,
    backgroundImage = null,
    opacity = 1,
  ) {
    this.elementName = elementName;
    this.dx = dx;
    this.dy = dy;
    this.width = width;
    this.height = height;
    this.opacity = opacity;

    this.focusable = focusable;

    if (backgroundImage) {
      // backgroundImage.width = width;
      // backgroundImage.height = height;
      //^ changing the dimension like this on html image element directly only works when it is shown in html context
      // but it doesn't really work if you plan to use it on canvas
      // use naturalWidth and naturalHeight of the image and then set larger/smaller destination width and height in canvas drawImage() method to actually scale the image
      this.backgroundImage = backgroundImage;
    }
  }

  setOpacity(newOpacity) {
    if (Number.isFinite(newOpacity)) {
      this.opacity = newOpacity;
    }
  }

  setDimensions(dx, dy, width, height) {
    this.dx = dx;
    this.dy = dy;
    this.width = width;
    this.height = height;
  }

  /** @param { CanvasRenderingContext2D } context2d */
  drawElement(context2d, rootDx, rootDy) {
    if (!this.active) return;

    context2d.save();

    let dx = this.dx;
    let dy = this.dy;

    if (this.flipHorizontal) {
      //context2d.translate(this.dx + this.width, this.dy);
      context2d.scale(-1, 1);
      dx = -this.dx - this.width;
    }

    if (this.flipVertical) {
      //context2d.translate(this.dx, this.dy + this.height);
      context2d.scale(1, -1);
      dy = -this.dy - this.height;
    }

    if (this.backgroundImage) {
      //console.log("element data: ", rootDx, " ", rootDy, " ", this.dx, " ", this.dy, " ", this.backgroundImage.width, " ", this.backgroundImage.height, " ", this.width, " ", this.height);

      context2d.drawImage(
        this.backgroundImage,
        0,
        0,
        this.backgroundImage.naturalWidth,
        this.backgroundImage.naturalHeight,
        rootDx + dx,
        rootDy + dy,
        this.width,
        this.height,
      );
    }

    return [dx, dy];
  }
}
