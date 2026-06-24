import Actor from "./Actor.js";

//TileActor use gid instead of actorName
export default class TileActor extends Actor {
  //for animating tiles
  /**
   * @typedef {Object} TileAnimationFrame
   * @property {number} tileGid
   * @property {Collision} collision
   * @property {number} duration
   */

  /** @type {Array<TileAnimationFrame>} */
  tiles = [];

  //change according to current tileGid, just like collision
  renderLast;

  currentFrameIndex = 0;
  totalDeltaTimeBeforeNextAnimationFrame = 0;

  toJSON() {
    let data = super.toJSON();

    data.tiles = [...this.tiles];
    data.renderLast = this.renderLast;
    data.currentFrameIndex = this.currentFrameIndex;
    data.totalDeltaTimeBeforeNextAnimationFrame =
      this.totalDeltaTimeBeforeNextAnimationFrame;

    return data;
  }

  constructor(tempId, position, tiles, renderLast = false, selectable = false) {
    super(tempId, null, position, tiles[0].collision, selectable);
    this.tiles = [...tiles];

    this.currentRenderData = {
      tileGid: this.tiles[0].tileGid,
    };

    this.renderLast = renderLast;
  }

  playAnimation(deltaTime) {
    if (this.tiles.length <= 1) return;

    if (
      this.totalDeltaTimeBeforeNextAnimationFrame >=
      this.tiles[this.currentFrameIndex].duration
    ) {
      this.totalDeltaTimeBeforeNextAnimationFrame = 0;
      this.currentFrameIndex++;

      //reset back to frame 0
      if (this.currentFrameIndex >= this.tiles.length) {
        this.currentFrameIndex = 0;
      }
      this.collision = {
        source: this,
        ...this.tiles[this.currentFrameIndex].collision,
      };
    }

    this.totalDeltaTimeBeforeNextAnimationFrame += deltaTime;

    this.currentRenderData.tileGid = this.tiles[this.currentFrameIndex].tileGid;
  }
}
