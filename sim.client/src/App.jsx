import { useState } from 'react'
import Controls from './components/Controls.jsx'
import WorldMap from './components/WorldMap.jsx'
import useSimSocket from './useSimSocket.js'

function App() {
  const { world, bunnies, bunnyCount, send } = useSimSocket()
  const [showStats, setShowStats] = useState(true)

  return (
    <div className="flex flex-row items-center justify-center h-screen w-screen">
      <div className='max-w-md'>
      <Controls
        bunnyCount={bunnyCount}
        onAddBunny={() => send('sim_add_bunny')}
        onSetSeed={(seed) => send('sim_set_seed', { seed })}
        showStats={showStats}
        onToggleStats={setShowStats}
      />
      </div>
      <WorldMap world={world} bunnies={bunnies} showStats={showStats} />
    </div>
  )
}

export default App
