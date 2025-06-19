export default class Animation
{
    source; //Actor

    currentFrameIndex = 0;
    totalDeltaTimeBeforeNextAnimationFrame = 0;

    animationSpritesheetName;
    
    //disregarding direction
    activeFrames = [];

    constructor(source, animationSpritesheetName, activeFrames)
    {
        this.source = source;
        this.animationSpritesheetName = animationSpritesheetName;
        
        this.addCollisionsSourceToFrames(activeFrames);
        
        this.activeFrames = [...activeFrames];
    }

    getCurrentActiveFrameData(deltaTime)
    {
        if(this.currentFrameIndex >= this.activeFrames.length)
        {
            this.currentFrameIndex = 0;
        }

        const currentFrame = this.activeFrames[this.currentFrameIndex];
        let collisions = [...currentFrame.collisions];
        let summons = [...currentFrame.summons];

        if(this.totalDeltaTimeBeforeNextAnimationFrame >= currentFrame.duration)
        {
            this.totalDeltaTimeBeforeNextAnimationFrame = 0;
            this.currentFrameIndex++;

            //play next frame
            const nextFrame = this.activeFrames[this.currentFrameIndex];

            collisions = [...nextFrame.collisions];
            summons = [...nextFrame.summons];
        }

        this.totalDeltaTimeBeforeNextAnimationFrame += deltaTime;

        return {
            sourceActorName: this.source.actorName,
            animationSpritesheetName: this.animationSpritesheetName,
            frameData: this.activeFrames[this.currentFrameIndex],
            collisions: collisions,
            summons: summons,
            isLastFrame: this.currentFrameIndex === this.activeFrames.length - 1 ? true : false
        }
    }

    addCollisionsSourceToFrames(frames)
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
                    }
                }
            }    
        }
    }

    resetAnim()
    {
        this.currentFrameIndex = 0;
        this.totalDeltaTimeBeforeNextAnimationFrame = 0;
    }
}