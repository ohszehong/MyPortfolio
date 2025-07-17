export default class Animation
{
    source; //Actor

    prevFrameIndex = null;
    currentFrameIndex = 0;
    totalDeltaTimeBeforeNextAnimationFrame = 0;

    animationSpritesheetName;
    
    //disregarding direction
    activeFrames = [];

    constructor(source, animationSpritesheetName, activeFrames)
    {
        this.source = source;
        this.animationSpritesheetName = animationSpritesheetName;
        
        this.initFrames(activeFrames);
        this.activeFrames = [...activeFrames];
    }

    getCurrentActiveFrameData(deltaTime)
    {
        const currentFrame = this.activeFrames[this.currentFrameIndex];
        
        if(!currentFrame) {
            console.log("Invalid frame, something went wrong.");
            return;
        }
        
        //only return true when the last frame is COMPLETED
        let lastFrameIsCompleted = false;

        let collisions = [];
        let summons = [];

        collisions = currentFrame.collisions;

        //right now the default animation data don't have default summon data [] (no empty array)
        if(currentFrame.summons)
        {
            summons = currentFrame.summons;
        }

        if(this.totalDeltaTimeBeforeNextAnimationFrame >= currentFrame.duration)
        {
            this.totalDeltaTimeBeforeNextAnimationFrame = 0;
            this.currentFrameIndex++;

            if(this.currentFrameIndex >= this.activeFrames.length)
            {
                this.resetAnim();
                lastFrameIsCompleted = true;
            }

            //play next frame
            const nextFrame = this.activeFrames[this.currentFrameIndex];

            collisions = nextFrame.collisions;

            summons = [];
            if(nextFrame.summons)
            {
                summons = nextFrame.summons;
            }
        }
        else if(this.currentFrameIndex === this.prevFrameIndex)
        {
            //ensure that it only spawns collisions/summons only once in that frame
            collisions = [];
            summons = [];
        }

        this.totalDeltaTimeBeforeNextAnimationFrame += deltaTime;
        this.prevFrameIndex = this.currentFrameIndex;

        return {
            sourceActorName: this.source.actorName,
            animationSpritesheetName: this.animationSpritesheetName,
            frameData: this.activeFrames[this.currentFrameIndex],
            collisions: collisions,
            summons: summons,
            lastFrameIsCompleted: lastFrameIsCompleted
        }
    }

    //add extra info to the raw frames data so that it can be used in the game
    initFrames(frames)
    {
        if(frames)
        {
            for(let i = 0; i < frames.length; i++)
            {
                if(frames[i] && frames[i].collisions)
                {
                    for(let j = 0; j < frames[i].collisions.length; j++)
                    {
                        frames[i].collisions[j].source = this.source;

                        //so that the engine know when to remove it from the spawnCollisions array
                        frames[i].collisions[j].duration = frames[i].duration;
                    }
                }
            }    
        }
    }

    resetAnim()
    {
        this.prevFrameIndex = null;
        this.currentFrameIndex = 0;
        this.totalDeltaTimeBeforeNextAnimationFrame = 0;
    }
}