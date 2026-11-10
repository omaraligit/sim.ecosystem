import BunnyCard from './BunnyCard.jsx'

export default function BunnyDeck({ bunnies }) {
  if (bunnies.length === 0) {
    return <p className="flex-1 text-center text-sm opacity-60">No bunnies in the deck yet.</p>
  }

  return (
    <div className="flex max-h-screen min-w-0 flex-1 flex-wrap justify-center gap-2 overflow-y-auto px-6 py-10">
      {bunnies.map((bunny) => (
        <div
          key={bunny.id}
          className="transition-transform duration-200 hover:z-10 hover:scale-150"
        >
          <BunnyCard bunny={bunny} />
        </div>
      ))}
    </div>
  )
}
