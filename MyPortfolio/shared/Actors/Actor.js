export default class Actor {
  tempId;

  actorName;
  position;

  /**
   * @typedef {Object} Collision
   * @property {string} collisionType
   * @property {number} ddx
   * @property {number} ddy
   * @property {boolean} active
   * @property {string} target
   * @property {number} width
   * @property {number} height
   */

  /** @type {Collision} */
  collision = null;

  selectable;

  //used for picking the correct spritesheet on the blob dictionary for rendering, playAnimation will issue latest render data
  currentRenderData = {};

  constructor(
    tempId,
    actorName,
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
    this.position = { ...position };

    if (collision && Object.keys(collision).length > 0) {
      this.collision = { source: this, ...collision };
    }

    this.selectable = selectable;
  }

  applyMovement(mapMaxWidth, mapMaxHeight, deltaTime) {}

  playAnimation(deltaTime) {}

  toJSON() {
    let copy = { ...this.collision };
    delete copy.source;

    const data = {
      tempId: this.tempId,
      actorName: this.actorName,
      position: this.position,
      collision: copy,
      selectable: this.selectable,
    };

    return data;
  }
}
