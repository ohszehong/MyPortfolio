import UIElement from "./UIElement";

export default class UImage extends UIElement
{
    imageddx = 0;
    imageddy = 0;

    image = null;

    /** @param { HTMLImageElement } image */
    constructor(elementName, dx, dy, width, height, image, imageddx, imageddy, imagewidth, imageheight, focusable = false, backgroundImage = null)
    {
        super(elementName, dx, dy, width, height, focusable, backgroundImage);

        this.imageddx = imageddx;
        this.imageddy = imageddy;

        image.width = imagewidth;
        image.height = imageheight;
        this.image = image;
    }

    setImageDimensions(ddx, ddy, width, height)
    {
        if(!this.image) return;

        this.imageddx = ddx;
        this.imageddy = ddy;
        
        this.image.width = width;
        this.image.height = height;
    }

    /** @param { CanvasRenderingContext2D } context2d */
    drawElement(context2d)
    {
        super.drawElement(context2d);
        context2d.drawImage(this.image, this.dx + this.imageddx, this.dy + this.imageddy);
    }
}