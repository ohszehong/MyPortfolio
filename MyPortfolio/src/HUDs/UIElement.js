export default class UIElement
{
    elementName = null;

    dx = 0;
    dy = 0;
    width = 0;
    height = 0;
    
    opacity = 1;

    backgroundImage = null;

    focusable = false;
    isFocused = false;

    onPointerEnter = () => {};
    onPointerLeave = () => {};

    /** @param {HTMLImageElement} backgroundImage */
    constructor(elementName, dx, dy, width, height, focusable = false, backgroundImage = null, opacity = 1)
    {
        this.elementName = elementName;
        this.dx = dx;
        this.dy = dy;
        this.width = width;
        this.height = height;
        this.opacity = opacity;

        this.focusable = focusable;

        if(backgroundImage)
        {
            backgroundImage.width = width;
            backgroundImage.height = height;
            this.backgroundImage = backgroundImage;
        }
    }

    setOpacity(newOpacity)
    {
        if(newOpacity)
        {
            this.opacity = newOpacity;
        }
    }

    setDimensions(dx, dy, width, height)
    {
        this.dx = dx;
        this.dy = dy;
        this.width = width;
        this.height = height;

        if(this.backgroundImage)
        {
            this.backgroundImage.width = width;
            this.backgroundImage.height = height;
        }
    }

    /** @param { CanvasRenderingContext2D } context2d */
    drawElement(context2d, rootDx, rootDy)
    {
        if(this.backgroundImage)
        {
            context2d.drawImage(this.backgroundImage, 
                0, 
                0, 
                this.backgroundImage.width, 
                this.backgroundImage.height,
                rootDx + this.dx, 
                rootDy + this.dy, 
                this.width, 
                this.height
            );
        }
    }
}