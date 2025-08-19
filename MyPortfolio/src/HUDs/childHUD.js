import UIElement from "./UIElement";

export default class childHUD 
{
    childHUDName = null;

    dx = 0;
    dy = 0;
    width = 0;
    height = 0;

    UIElements = {};

    constructor(childHUDName, dx, dy, width, height)
    {
        this.childHUDName = childHUDName;
        this.dx = dx;
        this.dy = dy;
        this.width = width;
        this.height = height;
    }

    /** @param { UIElement } newUIElement */
    addUIElement(newUIElement)
    {
        if(newUIElement instanceof UIElement)
        {
            this.UIElements[newUIElement.elementName] = newUIElement;
        }
    }

    getUIElement(elementName)
    {
        return this.UIElements[elementName];
    }

    getAllUIElements()
    {
        return Object.values(this.UIElements);
    }

    /** @param { CanvasRenderingContext2D } context2d */
    drawHUD(context2d, rootDx, rootDy, rootWidth, rootHeight)
    {
        for(const [elementName, element] of Object.entries(this.UIElements))
        {
            context2d.globalAlpha = element.opacity;
            element.drawElement(context2d, rootDx + this.dx, rootDy + this.dy);
            context2d.globalAlpha = 1;
        }
    }
}