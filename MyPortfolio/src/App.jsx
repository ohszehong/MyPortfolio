import { useState } from 'react'
import './App.css'
import BgBlocks from './BgBlocks'
import Console from './Console'
import Cassette from './Cassette'

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <p className='p-7'>Hi, Welcome to my portfolio.</p>
      <BgBlocks />
      <Console />
      <Cassette />
    </>
  )
}

export default App
