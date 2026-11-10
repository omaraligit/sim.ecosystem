import Bunny from './Bunny.jsx'
import Tile from './Tile.jsx'

export default function WorldMap({ world, bunnies }) {
  return (
    <div
      className="flex flex-wrap relative transition-all mx-auto"
      style={{ maxWidth: `${world.width * 40}px` }}
    >
      {world.tiles.map((row, i) =>
        row.map((type, j) => <Tile key={`${i}-${j}`} type={type} />),
      )}
      {bunnies.map((bunny) => (
        <Bunny key={bunny.id} x={bunny.x} y={bunny.y} />
      ))}
    </div>
  )
}
