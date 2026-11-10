function Stat({ icon, value, max, color }) {
  return (
    <div className="flex items-center gap-0.5">
      <span>{icon}</span>
      <progress className={`progress h-1 flex-1 ${color}`} value={value} max={max} />
      <span className="shrink-0 tabular-nums">
        {value}/{max}
      </span>
    </div>
  )
}

export default function BunnyCard({ bunny }) {
  const hp = bunny.isDead ? 0 : Math.max(bunny.maxAge - bunny.age, 0)

  return (
    <div
      className={`group relative flex aspect-[63/88] w-24 flex-col overflow-hidden rounded-lg border-[3px] border-yellow-400 bg-linear-to-b from-yellow-100 to-amber-200 p-1 text-[6px] text-neutral-800 shadow-lg ${bunny.isDead ? 'grayscale' : ''}`}
    >
      <div className="flex items-end justify-between leading-none">
        <div>
          <div className="text-[5px] font-bold uppercase italic">{bunny.stage}</div>
          <div className="text-[8px] font-black">Bunny #{bunny.id}</div>
        </div>
        <div className="font-black text-red-600">
          <span className="text-[5px]">HP</span> <span className="text-[8px]">{hp}</span>
        </div>
      </div>

      <div className="mt-0.5 flex flex-1 items-center justify-center rounded-sm border border-amber-500/70 bg-linear-to-br from-sky-200 via-emerald-100 to-lime-200 text-2xl shadow-inner">
        🐇
      </div>

      <div className="relative mx-1.5 -mt-1 rounded-sm bg-linear-to-r from-amber-400 via-yellow-100 to-amber-400 text-center text-[5px] italic">
        {bunny.gender === 'male' ? '♂ Male' : '♀ Female'} · Age {bunny.age}/{bunny.maxAge}
      </div>

      <div className="mt-0.5 space-y-px">
        <Stat icon="🍖" value={bunny.hunger} max={bunny.maxHunger} color="progress-warning" />
        <Stat icon="💧" value={bunny.thirst} max={bunny.maxThirst} color="progress-info" />
        <Stat icon="💛" value={bunny.happiness} max={bunny.maxHappiness} color="progress-success" />
      </div>

      <div className="mt-0.5 flex justify-between border-t border-amber-500/40 pt-px text-[5px]">
        <span>
          📍 {bunny.x}, {bunny.y}
        </span>
        <span>{bunny.isPregnant ? '🍼 Pregnant' : '★'}</span>
      </div>

      {bunny.isDead && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="-rotate-12 rounded-sm border border-red-700 bg-yellow-100/80 px-0.5 text-[9px] font-black text-red-700">
            FAINTED
          </span>
        </div>
      )}

      <div className="pointer-events-none absolute inset-0 bg-linear-to-tr from-transparent via-white/50 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
    </div>
  )
}
