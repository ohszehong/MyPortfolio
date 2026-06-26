import Block from "./Block";

export default class WalkPath extends Block {
  currentCharacterTintedDefaultImageCanvasRef = null;

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
    super(elementName, dx, dy, width, height, rgba, focusable, backgroundImage);
  }

  setCurrentCharacterTintedDefaultImageCanvasRef(characterCanvas) {
    this.currentCharacterTintedDefaultImageCanvasRef = characterCanvas;
  }

  /** @param { CanvasRenderingContext2D } context2d */
  drawElement(context2d, rootDx, rootDy) {
    const [dx, dy] = super.drawElementFromUIElementClass(
      context2d,
      rootDx,
      rootDy,
    );

    if (this.currentCharacterTintedDefaultImageCanvasRef) {
      const actualDy =
        rootDy +
        dy +
        this.height -
        this.currentCharacterTintedDefaultImageCanvasRef.height;
      context2d.drawImage(
        this.currentCharacterTintedDefaultImageCanvasRef,
        5,
        actualDy,
      );
    }

    context2d.fillStyle = this.rgba;
    context2d.fillRect(rootDx + dx, rootDy + dy, this.width, this.height);

    context2d.restore();
  }

  //TO-DO: onClick on WalkPath to summon character
  //The "AI" for characters (both ally and enemy)
}
