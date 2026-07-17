import UIElement from "./UIElement.js";

/**
 * @typedef {Object} text
 * @property {string} text
 * @property {string} color
 * @property {string} alignment
 * @property {number} pixelSize
 * @property {string} fontFamily
 * @property {number} textActualPadding
 */

export default class Label extends UIElement {
  /** @type {text} */
  labelTextData = {
    text: null,
    color: null,
    alignment: null,
    pixelSize: null,
    fontFamily: null,
    textActualPadding: null,
  };

  constructor(
    elementName,
    dx,
    dy,
    width,
    height,
    labelText,
    labelTextAlignment,
    labelColor,
    labelPixelSize,
    labelFontFamily,
    focusable = false,
    backgroundImage = null,
  ) {
    super(elementName, dx, dy, width, height, focusable, backgroundImage);
    this.updateLabelTextData(
      labelText,
      labelTextAlignment,
      labelColor,
      labelPixelSize,
      labelFontFamily,
    );
  }

  updateLabelTextData(
    labelText,
    labelTextAlignment,
    labelColor,
    labelPixelSize,
    labelFontFamily,
  ) {
    //allow number like 0 and etc which are deemed to be not truthy
    if (labelText != null) {
      this.setLabelText(labelText);
    }

    if (labelTextAlignment) {
      this.labelTextData.alignment = labelTextAlignment;
    }

    if (labelColor) {
      this.setLabelColor(labelColor);
    }

    if (labelPixelSize) {
      this.labelTextData.pixelSize = labelPixelSize;
    }

    if (labelFontFamily) {
      this.labelTextData.fontFamily = labelFontFamily;
    }

    this.updateTextBounds();
  }

  //by default, show K for number exceeds thousand and M for number exceeds million
  setLabelText(newText, shouldFormatNumber = false) {
    if (Number.isFinite(newText)) {
      if (shouldFormatNumber) {
        let roundedValueText = newText;
        if (newText >= 1000000) {
          roundedValueText = `${(newText / 1000000).toFixed(2)}M`;
        } else if (newText >= 1000) {
          roundedValueText = `${(newText / 1000).toFixed(2)}K`;
        }
        newText = roundedValueText;
      } else {
        newText = String(newText);
      }
    }
    this.labelTextData.text = newText;
  }

  setLabelColor(newColor) {
    this.labelTextData.color = newColor;
  }

  updateTextBounds() {
    const context2d = new OffscreenCanvas(this.width, this.height).getContext(
      "2d",
    );

    context2d.font = `${this.labelTextData.pixelSize}px ${this.labelTextData.fontFamily}`;
    context2d.textAlign = this.labelTextData.alignment;

    const metrics = context2d.measureText(this.labelTextData.text);

    const textActualHeight =
      metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;
    this.labelTextData.textActualPadding = (this.height - textActualHeight) / 2;
  }

  /** @param { CanvasRenderingContext2D } context2d */
  drawElement(context2d, rootDx, rootDy) {
    const [dx, dy] = super.drawElement(context2d, rootDx, rootDy);

    context2d.textAlign = this.labelTextData.alignment;
    context2d.font = `${this.labelTextData.pixelSize}px ${this.labelTextData.fontFamily}`;
    context2d.fillStyle = this.labelTextData.color;

    context2d.fillText(
      this.labelTextData.text,
      rootDx + dx,
      rootDy + dy + this.height - this.labelTextData.textActualPadding,
      this.width,
    );

    context2d.restore();
  }
}
