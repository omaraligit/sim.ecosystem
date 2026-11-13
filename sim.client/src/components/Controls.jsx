import { useState } from 'react'

export default function Controls({ bunnyCount, onAddBunny, onSetSeed, showStats, onToggleStats, showTileValues, onToggleTileValues }) {
  const [seed, setSeed] = useState('42')

  return (
    <div className="flex flex-row flex-wrap items-center gap-2 rounded-box bg-base-200 px-2 py-1 text-xs">
      <button className="btn btn-primary btn-xs" onClick={onAddBunny}>
        Add Bunny
      </button>
      <span className="badge badge-ghost badge-xs">🐰 {bunnyCount}</span>

      <div className="divider divider-horizontal mx-0" />

      <form
        className="join"
        onSubmit={(e) => {
          e.preventDefault()
          onSetSeed(seed)
        }}
      >
        <input
          type="number"
          className="input input-xs join-item w-16"
          placeholder="Seed"
          value={seed}
          onChange={(e) => setSeed(e.target.value)}
        />
        <button type="submit" className="btn btn-xs join-item">
          Set Seed
        </button>
      </form>

      <div className="divider divider-horizontal mx-0" />

      <label className="flex cursor-pointer items-center gap-1">
        <input
          type="checkbox"
          className="toggle toggle-primary toggle-xs"
          checked={showStats}
          onChange={(e) => onToggleStats(e.target.checked)}
        />
        Stats
      </label>

      <label className="flex cursor-pointer items-center gap-1">
        <input
          type="checkbox"
          className="toggle toggle-primary toggle-xs"
          checked={showTileValues}
          onChange={(e) => onToggleTileValues(e.target.checked)}
        />
        Tile values
      </label>
    </div>
  )
}
