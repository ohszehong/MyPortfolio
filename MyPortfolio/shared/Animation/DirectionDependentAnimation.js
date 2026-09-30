import Animation from "./Animation.js";

export default class DirectionDependentAnimation extends Animation {
  currentDirection;

  //up - 0
  //down - 1
  //left - 2
  //right - 3

  directionGroupedFrames = new Map();

  constructor(
    actor,
    animationSpritesheetName,
    animationFrames,
    activeDirection = 3,
  ) {
    super(
      actor,
      animationSpritesheetName,
      animationFrames[activeDirection].frames,
    );

    const remainingDirections = [...this.directionGroupedFrames.keys()].filter(
      (key) => key != activeDirection,
    );

    remainingDirections.forEach((direction) => {
      super.initFrames(animationFrames[direction]?.frames);
    });

    this.directionGroupedFrames.set(0, animationFrames[0]?.frames);
    this.directionGroupedFrames.set(1, animationFrames[1]?.frames);
    this.directionGroupedFrames.set(2, animationFrames[2]?.frames);
    this.directionGroupedFrames.set(3, animationFrames[3]?.frames);

    this.currentDirection = activeDirection;
  }

  //follow source direction by default
  getCurrentActiveFrameData(deltaTime) {
    if (this.currentDirection != this.source.facingDirection) {
      this.currentDirection = this.source.facingDirection;
      this.resetAnim();

      this.activeFrames = this.directionGroupedFrames.get(
        this.currentDirection,
      );
    }

    return {
      ...super.getCurrentActiveFrameData(deltaTime),
      animationSpritesheetDirection: this.currentDirection,
    };
  }
}
