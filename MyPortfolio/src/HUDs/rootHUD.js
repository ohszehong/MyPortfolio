import childHUD from "./childHUD";

export default class rootHUD 
{
    HUDName = null;

    /** @type { OffscreenCanvas } */
    HUDCanvas = null;

    dx = 0;
    dy = 0;
    width = 0;
    height = 0;

    childHUDs = {}

    constructor(HUDName, dx, dy, width, height)
    {
        this.HUDName = HUDName;
        this.dx = dx;
        this.dy = dy;
        this.width = width;
        this.height = height;

        this.HUDCanvas = new OffscreenCanvas(width, height);
    }

    /** @param { childHUD } childHUD */
    addChildHUD(childHUD)
    {
        this.childHUDs[childHUD.childHUDName] = {
            HUD: childHUD,
            active: false
        };
    }

    setHUDActive(childHUDName, active)
    {
        if(this.childHUDs[childHUDName])
        {
            if(this.childHUDs[childHUDName].active != active)
            {
                this.childHUDs[childHUDName].active = active;

                //update the canvas 
                this.drawHUDs();
            }
        }
    }

    drawHUDs()
    {
        const context2d = this.HUDCanvas.getContext("2d");

        for(const [childHUDName, HUDData] of Object.entries(this.childHUDs))
        {
            if(HUDData.active)
            {
                if(HUDData.HUD)
                {
                    HUDData.HUD.drawHUD(context2d);
                }
            }
        }
    }
}