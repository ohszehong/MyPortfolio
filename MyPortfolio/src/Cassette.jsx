import React, { useState, useEffect } from 'react'

export default function Cassette({isDraggingCassette, setIsDraggingCassette}) {

  const [startScrollX, setStartScrollX] = useState(0);
  const [isDraggingContainer, setIsDraggingContainer] = useState(false);

  const cassetteItemsBgColors = ["bg-purple-300", "bg-pink-200", "bg-yellow-100", "bg-purple-100"];

  useEffect(() => {
    window.addEventListener('pointerup', handleResetContainerDrag);
    window.addEventListener('blur', handleResetContainerDrag);

     return () => {
       window.removeEventListener('pointerup', handleResetContainerDrag);
       window.removeEventListener('blur', handleResetContainerDrag);
     };

  }, []);

  /** @param {React.PointerEvent} event */
  function handleContainerPointerDown(event)
  {
    //left click only for mouse
    if(event.pointerType == 'mouse')
    {
      if(event.button != '0') return;
    }

    setStartScrollX(event.pageX);
    setIsDraggingContainer(true);
  }

  /** @param {React.PointerEvent} event */
  function handleResetContainerDrag(event)
  {
    setStartScrollX(0);
    setIsDraggingContainer(false);
  }

  /** @param {React.PointerEvent} event */
  function handleContainerPointerMove(event)
  {
    event.preventDefault();

    /** @type {HTMLElement} */
    let cassetteContainer = event.currentTarget;

    if(cassetteContainer && isDraggingContainer)
    {
      const currentMouseX = event.pageX;
      const distanceXToScroll = currentMouseX - startScrollX;

      cassetteContainer.scrollLeft += distanceXToScroll * 1.5;
      setStartScrollX(currentMouseX);
    }
  }

  /** @param {React.PointerEvent} event */
  function centerEventTargetAroundCursor(event)
  {
    const target = event.currentTarget;

    if(target)
      {
        const targetBounds = target.getBoundingClientRect();
        const targetWidth = targetBounds.width;
        const targetHeight = targetBounds.height;
  
        const targetHalfWidth = targetWidth / 2;
        const targetHalfHeight = targetHeight / 2;
  
        const targetXMid = targetBounds.left + targetHalfWidth;
        const targetYMid = targetBounds.top + targetHalfHeight;
  
        const newLeftOffset = targetXMid - event.pageX;
        const newTopOffset = targetYMid - event.pageY;
  
        target.style.left = `${targetBounds.left - newLeftOffset}px`;
        target.style.top = `${targetBounds.top - newTopOffset}px`;
        
        target.style.position = 'absolute';
        target.style.maxWidth = `${targetWidth}px`;
      }
  }

  /** @param {React.PointerEvent} event */
  function handleCassettePointerDown(event)
  {
    //left click only for mouse
    if(event.pointerType == 'mouse')
    {
        if(event.button != '0') return;
    }

    setIsDraggingCassette(true);
    centerEventTargetAroundCursor(event);
  }

   /** @param {React.PointerEvent} event */
   function handleCassettePointerMove(event)
   { 
     event.preventDefault();
     console.log("moving...");
     if(isDraggingCassette)
     {
      event.stopPropagation();
      centerEventTargetAroundCursor(event);
     }
   }

   /** @param {React.PointerEvent} event */
   function handleResetCassetteProperties(event)
   { 
     if(!isDraggingCassette) return;
     
     setIsDraggingCassette(false);
     const cassette = event.currentTarget;
 
     if(cassette)
     {
       cassette.style.maxWidth = '';
       cassette.style.left = '';
       cassette.style.top = '';
       cassette.style.position = '';
     }
   }



  return (
  <>
    <div 
      id='cassette-flexbox-container' 
      onPointerDown={handleContainerPointerDown} 
      onPointerMove={handleContainerPointerMove} 
      className='inline-flex w-[80%] gap-x-16 lg:gap-x-32 mb-10 mt-4 md:w-[70%] lg:w-[80%] hover:cursor-grab'
      >
      {
        cassetteItemsBgColors.map((bgColor, index) => (
          <div
            onPointerDown={handleCassettePointerDown} 
            onPointerUp={handleResetCassetteProperties}
            onPointerMove={handleCassettePointerMove}
            onPointerLeave={handleResetCassetteProperties}
            onPointerCancel={handleResetCassetteProperties}
            onKeyDown={() => {console.log("Key pressed...")}}
            key={index} 
            className={`flex-shrink-0 w-[70%] lg:w-[55%] 2xl:w-[60%] 3xl:w-[55%] ${bgColor} touch-none`}>
              <img draggable='false' src={'src/assets/drawing.png'} />
          </div>
        ))
      }
    </div>
  </>
  )
}