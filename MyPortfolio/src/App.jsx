import { useState } from 'react'
import './App.css'
import BgBlocks from './BgBlocks'
import Console from './Console'
import Cassette from './Cassette'

function App() {
  const [isDraggingCassette, setIsDraggingCassette] = useState(false);

  return (
    <>
      <p className='p-7'>Hi, Welcome to my portfolio.</p>
      <BgBlocks />
      <Console isDraggingCassette={isDraggingCassette}/>
      <Cassette isDraggingCassette={isDraggingCassette} setIsDraggingCassette={setIsDraggingCassette}/>
    </>
  )
}

export default App
