const TILE_ICONS = {
  tree: '🌳',
  grass: '🌿',
  water: '💧',
  rock: '🪨',
}

export default function Tile({ type }) {
  return (
    <div className="w-10 h-10 bg-base-100 flex items-center justify-center text-xs text-base-200">
      <div>{TILE_ICONS[type]}</div>
    </div>
  )
}
