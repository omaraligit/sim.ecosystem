import { useState } from 'react'

export default function Controls({ bunnyCount, onAddBunny, onSetSeed, showStats, onToggleStats }) {
  const [seed, setSeed] = useState('42')

  return (
    <div className="flex flex-col">
      <div className="flex flex-row items-center justify-center gap-2">
      <button className="btn btn-primary" onClick={onAddBunny}>
        Add Bunny
      </button>
      <div className="text-sm">Bunnies: {bunnyCount}</div>
      </div>
      <input
        type="number"
        className="input input-bordered"
        placeholder="Seed"
        value={seed}
        onChange={(e) => setSeed(e.target.value)}
      />
      <button className="btn btn-primary" onClick={() => onSetSeed(seed)}>
        Set Seed
      </button>
      <label className="label mt-2 cursor-pointer gap-2 text-sm">
        <input
          type="checkbox"
          className="toggle toggle-primary"
          checked={showStats}
          onChange={(e) => onToggleStats(e.target.checked)}
        />
        Show stats
      </label>
    </div>
  )
}
