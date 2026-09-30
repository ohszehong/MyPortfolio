export default class Actor {
  staticId;
  tempId;

  actorName;

  position;
  previousPosition; //for rewinding if blocked by something

  /**
   * @typedef {Object} Collision
   * @property {number} collisionType
   * @property {number} ddx
   * @property {number} ddy
   * @property {boolean} active
   * @property {number} target
   * @property {number} width
   * @property {number} height
   */

  /** @type {Collision} */
  collision = null;

  selectable;

  //used for picking the correct spritesheet on the blob dictionary for rendering, playAnimation will issue latest render data
  currentRenderData = {};

  facingDirection;

  shouldBeDestroyed = false;

  constructor(
    staticId,
    tempId,
    actorName,
    facingDirection,
    position = { dx: 0, dy: 0 },
    collision = null,
    selectable = false,
  ) {
    if (tempId) {
      this.tempId = tempId;
    } else {
      this.tempId = crypto.randomUUID();
    }

    this.actorName = actorName;
    this.facingDirection = facingDirection;
    this.position = { ...position };

    if (collision && Object.keys(collision).length > 0) {
      this.collision = { source: this, ...collision };
    }

    this.selectable = selectable;
  }

  applyMovement(mapMaxWidth, mapMaxHeight, deltaTime) {}

  playAnimation(deltaTime) {}

  recoverLatestAnimationsData(Animation, latestAnimationData) {
    Animation.prevFrameIndex = latestAnimationData.prevFrameIndex;
    Animation.currentFrameIndex = latestAnimationData.currentFrameIndex;
    Animation.totalDeltaTimeBeforeNextAnimationFrame =
      latestAnimationData.totalDeltaTimeBeforeNextAnimationFrame;
  }

  toJSON() {
    let copy = { ...this.collision };
    delete copy.source;

    const data = {
      staticId: this.staticId,
      tempId: this.tempId,
      actorName: this.actorName,
      facingDirection: this.facingDirection,
      position: this.position,
      collision: copy,
      selectable: this.selectable,
    };

    return data;
  }
}
