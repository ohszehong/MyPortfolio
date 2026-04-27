import UIElement from "./UIElement";
import Label from "./Label";

export default class Button extends UIElement
{
    /** @type {Label} */
    buttonLabelTextData = null;

    backgroundColor = null;

    onClick = () => {};
    
    constructor(elementName, dx, dy, width, height, backgroundColor = null, backgroundImage = null)
    {
        super(elementName, dx, dy, width, height, true, backgroundImage);
        this.backgroundColor = backgroundColor;

        this.buttonLabelTextData =  new Label(null, dx, dy, width, height, "button", "center", "black", width/2, "Darinia");
    }

    // /** @param {Label} newLabel */
    // addLabel(ddx, ddy, width, height, labelText, labelTextAlignment, labelColor, labelPixelSize, labelFontFamily)
    // {
    //     this.buttonLabelTextData = new Label(null, ddx, ddy, width, height, labelText, labelTextAlignment, labelColor, labelPixelSize, labelFontFamily, false, null);
    // }

    updateLabelTextData(width, height, labelText, labelTextAlignment, labelColor, labelPixelSize, labelFontFamily)
    {
        if(this.buttonLabelTextData)
        {
            if(width)
            {
                this.buttonLabelTextData.width = width;
            }

            if(height)
            {
                this.buttonLabelTextData.height = height;
            }

            this.buttonLabelTextData.updateLabelTextData(labelText, labelTextAlignment, labelColor, labelPixelSize, labelFontFamily);
        }
    }

    setLabelText(newText)
    {
        if(this.buttonLabelTextData)
        {
            this.buttonLabelTextData.setLabelText(newText);
        }
    }

    setLabelColor(newColor)
    {
        if(this.buttonLabelTextData)
        {
            this.buttonLabelTextData.setLabelColor(newColor);
        }
    }

    /** @param { CanvasRenderingContext2D } context2d */
    drawElement(context2d, rootDx, rootDy)
    {
        super.drawElement(context2d);

        if(this.backgroundColor)
        {
            context2d.fillStyle = this.backgroundColor;
            context2d.fillRect(rootDx + this.dx, rootDy + this.dy, this.width, this.height);
        }

        if(this.buttonLabelTextData)
        {
            this.buttonLabelTextData.drawElement(context2d, rootDx, rootDy);
        }
    }
}