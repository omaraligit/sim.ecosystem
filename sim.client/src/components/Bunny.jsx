const ACTION_ICONS = {
  DRINK: '💧',
  EAT: '🌿',
  WANDER: '🐾',
}

function Bar({ icon, value, color }) {
  return (
    <div className="flex items-center gap-0.5">
      <span className="w-2 text-center">{icon}</span>
      <div className="h-1 w-8 overflow-hidden rounded-full bg-neutral-200">
        <div className={`h-full ${color}`} style={{ width: `${Math.min(100, value)}%` }} />
      </div>
      <span className="w-3 text-right tabular-nums">{value}</span>
    </div>
  )
}

export default function Bunny({ bunny, showStats }) {
  const { x, y, currentAction } = bunny

  return (
    <div
      className="w-10 h-10 absolute z-10 text-xs flex items-center justify-center transition-all duration-750 ease-in-out text-sm hover:z-20"
      style={{
        top: `calc(var(--spacing) * ${x * 10})`,
        left: `calc(var(--spacing) * ${y * 10})`,
      }}
    >
      {showStats && (
      <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 -mb-1 whitespace-nowrap rounded-md border border-neutral-300 bg-white/95 px-1 py-0.5 text-[6px] leading-tight text-neutral-800 shadow">
        <div className="flex items-center justify-between gap-1 font-bold">
          <span>
            #{bunny.id} {bunny.gender === 'male' ? '♂' : '♀'} {bunny.stage}
            {bunny.isPregnant && ' 🍼'}
          </span>
          <span className="font-normal tabular-nums opacity-70">
            {bunny.age}/{bunny.maxAge}
          </span>
        </div>
        <div className="font-semibold">
          {ACTION_ICONS[currentAction] ?? '❔'} {currentAction?.toLowerCase() ?? 'idle'}
        </div>
        <Bar icon="🍖" value={bunny.hunger} color="bg-amber-500" />
        <Bar icon="💧" value={bunny.thirst} color="bg-sky-500" />
        <Bar icon="💛" value={bunny.happiness} color="bg-emerald-500" />
        <div className="absolute left-1/2 top-full -translate-x-1/2 h-0 w-0 border-x-4 border-t-4 border-x-transparent border-t-white" />
      </div>
      )}
      <div className="rounded-full w-5 h-5 p-1 flex items-center justify-center">
        🐇
      </div>
    </div>
  )
}
