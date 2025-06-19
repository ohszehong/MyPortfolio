import Animation from "./Animation.js";

export default class DirectionDependentAnimation extends Animation
{
    source; //Actor

    currentFrameIndex = 0;
    totalDeltaTimeBeforeNextAnimationFrame = 0;

    currentDirection;

    animationSpritesheetName;

    activeFrames = [];

    directionGroupedFrames = {
        up: [],
        down: [],
        left: [],
        right: []
    }

    constructor(actor, animationSpritesheetName, animationFrames, activeDirection = "right")
    {
        super(actor, animationSpritesheetName, animationFrames[activeDirection].frames);

        const remainingDirections = Object.keys(this.directionGroupedFrames).filter((key) => key != activeDirection);

        remainingDirections.forEach((direction) => {
            super.addCollisionsSourceToFrames(animationFrames[direction].frames);
        })

        this.directionGroupedFrames.up = animationFrames.up?.frames;
        this.directionGroupedFrames.down = animationFrames.down?.frames;
        this.directionGroupedFrames.left = animationFrames.left?.frames;
        this.directionGroupedFrames.right = animationFrames.right?.frames;

        this.currentDirection = activeDirection;
    }

    //follow source direction by default
    getCurrentActiveFrameData(deltaTime)
    {
        if(this.currentDirection != this.source.facingDirection)
        {
            this.currentDirection = this.source.facingDirection;
            this.resetAnim();

            this.activeFrames = this.directionGroupedFrames[this.currentDirection];
        }

        return {
            ...super.getCurrentActiveFrameData(deltaTime),
            animationSpritesheetDirection: this.currentDirection
        }
    }
}