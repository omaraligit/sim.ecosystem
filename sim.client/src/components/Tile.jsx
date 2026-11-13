const TILE_ICONS = {
  tree: '🌳',
  grass: '🌿',
  water: '💧',
  rock: '🪨',
}

export default function Tile({ type, content, showValue }) {
  return (
    <div className="w-10 h-10 bg-base-100 flex items-center justify-center text-xs text-base-200 relative">
      {showValue && <div className="absolute top-0 left-0 text-[10px] text-white">{content.toFixed(1)}</div>}
      <div className="text-xs">{content > 0 ? TILE_ICONS[type] : ' '}</div>
    </div>
  )
}
