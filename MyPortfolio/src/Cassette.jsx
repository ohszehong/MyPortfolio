import React from 'react'

export default function Cassette() {
  return (
    <div className='flex flex-col items-center gap-4 mb-10 mt-8 md:flex-row md:justify-center'>
      <div className='flex-none w-[150px] h-[50px] bg-purple-300'>
        <img src={'src/assets/drawing.png'}/>
      </div>
      <div className='shrink w-64 h-[50px] bg-pink-200'>
      <img className='' src={'src/assets/drawing.png'}/>
      </div>
      <div className='flex-none w-[150px] h-[50px] bg-yellow-100'></div>
      <div className='flex-none w-[150px] h-[50px] bg-purple-100'></div>
    </div>
  )
}