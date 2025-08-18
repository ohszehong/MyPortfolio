import UIElement from "./UIElement";

/**
   * @typedef {Object} text
   * @property {string} text
   * @property {string} color
   * @property {string} alignment
   * @property {number} pixelSize
   * @property {string} fontFamily
   * @property {number} textActualPadding
   */

export default class Label extends UIElement
{
    /** @type {text} */
    labelTextData = {
        text: null,
        color: null,
        alignment: null,
        pixelSize: null,
        fontFamily: null,
        textActualPadding: null,
    };

    constructor(elementName, dx, dy, width, height, labelText, labelTextAlignment, labelColor, labelPixelSize, labelFontFamily, focusable = false, backgroundImage = null)
    {
        super(elementName, dx, dy, width, height, focusable, backgroundImage);
        this.updateLabelTextData(labelText, labelTextAlignment, labelColor, labelPixelSize, labelFontFamily);
    }

    updateLabelTextData(labelText, labelTextAlignment, labelColor, labelPixelSize, labelFontFamily)
    {
        if(labelText)
        {
            this.labelTextData.text = labelText;
        }

        if(labelTextAlignment)
        {
            this.labelTextData.alignment = labelTextAlignment;
        }

        if(labelColor)
        {
            this.labelTextData.color = labelColor;
        }

        if(labelPixelSize)
        {
            this.labelTextData.pixelSize = labelPixelSize;
        }

        if(labelFontFamily)
        {
            this.labelTextData.fontFamily = labelFontFamily;
        }

        this.updateTextBounds();
    }

    setLabelText(newText)
    {
        this.labelTextData.text = newText;
    }

    updateTextBounds()
    {
        const context2d = new OffscreenCanvas(this.width, this.height).getContext("2d");

        context2d.font = `${this.labelTextData.pixelSize}px ${this.labelTextData.fontFamily}`;
        context2d.textAlign = this.labelTextData.alignment;

        const metrics = context2d.measureText(this.labelTextData.text);

        const textActualHeight = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;
        this.labelTextData.textActualPadding = (this.height - textActualHeight) / 2;
    }

    /** @param { CanvasRenderingContext2D } context2d */
    drawElement(context2d)
    {
        super.drawElement(context2d);

        context2d.font = `${this.labelTextData.pixelSize}px ${this.labelTextData.fontFamily}`;
        context2d.fillStyle = this.labelTextData.color;
        
        context2d.fillText(
          this.labelTextData.text,
          this.dx,
          this.dy + this.height - this.labelTextData.textActualPadding,
          this.width
        );
    }
}