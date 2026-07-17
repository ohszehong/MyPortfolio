import childHUD from "./childHUD.js";

export default class rootHUD {
  HUDName = null;

  dx = 0;
  dy = 0;
  width = 0;
  height = 0;

  childHUDs = {};

  constructor(HUDName, dx, dy, width, height) {
    this.HUDName = HUDName;
    this.dx = dx;
    this.dy = dy;
    this.width = width;
    this.height = height;
  }

  /** @param { childHUD } childHUD */
  addChildHUD(childHUD) {
    this.childHUDs[childHUD.childHUDName] = {
      HUD: childHUD,
      active: false,
    };
  }

  setHUDActive(childHUDName, active) {
    if (this.childHUDs[childHUDName]) {
      if (this.childHUDs[childHUDName].active != active) {
        this.childHUDs[childHUDName].active = active;
      }
    }
  }

  drawHUDs(context2d) {
    for (const HUDData of Object.values(this.childHUDs)) {
      if (HUDData.active) {
        if (HUDData.HUD) {
          HUDData.HUD.drawHUD(
            context2d,
            this.dx,
            this.dy,
            this.width,
            this.height,
          );
        }
      }
    }
  }

  getCursorOverlappedElement(cursorX, cursorY) {
    for (const HUDData of Object.values(this.childHUDs)) {
      if (HUDData.active && HUDData.HUD) {
        for (const element of HUDData.HUD.getAllUIElements()) {
          if (!element.focusable) continue;

          if (
            cursorX >= this.dx + element.dx &&
            cursorX <= this.dx + element.dx + element.width &&
            cursorY >= this.dy + element.dy &&
            cursorY <= this.dy + element.dy + element.height
          ) {
            return element;
          }
        }
      }
    }
    return null;
  }
}
