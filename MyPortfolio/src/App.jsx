import { useState } from 'react'
import './App.css'
import BgBlocks from './BgBlocks'
import Console from './Console'

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
    <div className='relative w-lvw h-lvh'>
      <p className='top-[6.7em] pt-8 text-8xl max-md:text-6xl max-sm:text-4xl'>Hi, Welcome to my portfolio.</p>
      <BgBlocks />
      <Console />
    </div>
    </>
  )
}

export default App
