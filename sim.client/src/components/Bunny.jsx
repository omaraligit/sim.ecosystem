export default function Bunny({ x, y }) {
  return (
    <div
      className="w-10 h-10 absolute text-xs flex items-center justify-center transition-all duration-750 ease-in-out text-sm"
      style={{
        top: `calc(var(--spacing) * ${x * 10})`,
        left: `calc(var(--spacing) * ${y * 10})`,
      }}
    >
      <div className="rounded-full w-5 h-5 p-1 flex items-center justify-center">
        🐇
      </div>
    </div>
  )
}
