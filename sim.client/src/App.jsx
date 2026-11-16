import { useState } from 'react'
import Controls from './components/Controls.jsx'
import HistoryCharts from './components/HistoryCharts.jsx'
import WorldMap from './components/WorldMap.jsx'
import useSimSocket from './useSimSocket.js'

function App() {
  const { world, bunnies, bunnyCount, tilesContent, tilePopulation, tilePopulationThreshold, history, send } = useSimSocket()
  const [showStats, setShowStats] = useState(true)
  const [showTileValues, setShowTileValues] = useState(false)

  return (
    <div className="flex flex-col items-center justify-center gap-3 min-h-screen w-screen p-4">
      <Controls
        bunnyCount={bunnyCount}
        onAddBunny={() => send('sim_add_bunny')}
        onSetSeed={(seed) => send('sim_set_seed', { seed })}
        showStats={showStats}
        onToggleStats={setShowStats}
        showTileValues={showTileValues}
        onToggleTileValues={setShowTileValues}
      />
      <div className="flex flex-row flex-wrap items-start justify-center gap-4">
        <WorldMap
          world={world}
          bunnies={bunnies}
          tilesContent={tilesContent}
          tilePopulation={tilePopulation}
          tilePopulationThreshold={tilePopulationThreshold}
          showStats={showStats}
          showTileValues={showTileValues}
        />
        <HistoryCharts history={history} />
      </div>
    </div>
  )
}

export default App
