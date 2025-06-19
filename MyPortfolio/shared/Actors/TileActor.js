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

  currentFrameIndex = 0;
  totalDeltaTimeBeforeNextAnimationFrame = 0;

  toJSON()
  {
     let data = super.toJSON();

     data.tiles = [...this.tiles];
     data.currentFrameIndex = this.currentFrameIndex;
     data.totalDeltaTimeBeforeNextAnimationFrame = this.totalDeltaTimeBeforeNextAnimationFrame;

     return data;
  }


  constructor(
    tempId,
    position,
    tiles,
    selectable = false
  ) {
    super(
      tempId,
      null,
      position,
      tiles[0].collision,
      selectable
    );
    this.tiles = [...tiles];
  }

  getCurrentActorData(deltaTime) {
    if(this.tiles.length < 0) return;

    if(this.tiles.length === 0) {
      return {
        tileGid: this.tiles[0].tileGid,
        position: {...this.position},
        collisions: [...this.collision]
      }
    }

    //reset back to frame 0
    if (this.currentFrameIndex > this.tiles.length) {
      this.currentFrameIndex = 0;
    }

    this.totalDeltaTimeBeforeNextAnimationFrame += deltaTime;

    if (
      this.totalDeltaTimeBeforeNextAnimationFrame >=
      this.tiles[this.currentFrameIndex].duration
    ) {
      this.totalDeltaTimeBeforeNextAnimationFrame = 0;
      this.currentFrameIndex++;
      this.collision = {source: this, ...this.tiles[this.currentFrameIndex].collision};
    }

    return {
      tileGid: this.tiles[this.currentFrameIndex].tileGid,
      position: {...this.position},
      collisions: [...this.collision]
    };
  }
}
