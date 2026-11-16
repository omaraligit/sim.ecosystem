import { useEffect, useRef } from 'react'
import p5 from 'p5'

const TILE = 40

const TILE_COLOR = {
  tree: [46, 125, 50],
  grass: [149, 213, 178],
  water: [72, 202, 228],
  rock: [120, 144, 156],
}

const TILE_ICON = {
  tree: '🌳',
  grass: '🌿',
  water: '💧',
  rock: '🪨',
}

export default function WorldMap({ world, bunnies, tilesContent, tilePopulation, showStats, showTileValues }) {
  const hostRef = useRef(null)
  const stateRef = useRef({})
  const sketchRef = useRef(null)

  useEffect(() => {
    stateRef.current = { world, bunnies, tilesContent, tilePopulation, showStats, showTileValues }
    sketchRef.current?.redraw()
  })

  useEffect(() => {
    const host = hostRef.current
    const sketch = new p5((p) => {
      p.setup = () => {
        p.createCanvas(TILE, TILE)
        p.pixelDensity(1)
        p.textAlign(p.CENTER, p.CENTER)
        p.textFont('sans-serif')
        p.noLoop()
      }

      p.draw = () => {
        const { world, bunnies, tilesContent, tilePopulation, showStats, showTileValues } = stateRef.current
        const rows = world.tiles?.length || 1
        const cols = world.tiles?.[0]?.length || 1
        if (p.width !== cols * TILE || p.height !== rows * TILE) p.resizeCanvas(cols * TILE, rows * TILE, true)

        p.background(20)
        if (!world.tiles?.length) return

        for (let i = 0; i < world.tiles.length; i++) {
          const row = world.tiles[i]
          for (let j = 0; j < row.length; j++) {
            const content = tilesContent?.[i]?.[j] ?? 0
            const base = TILE_COLOR[row[j]] || [40, 40, 40]
            const amount = content > 0 ? 0.35 + (0.65 * Math.min(content, 10)) / 10 : 0.25
            p.noStroke()
            p.fill(base[0] * amount, base[1] * amount, base[2] * amount)
            p.rect(j * TILE, i * TILE, TILE, TILE)

            if (content > 0) {
              p.fill(255)
              p.textSize(16)
              p.text(TILE_ICON[row[j]] || '', j * TILE + TILE / 2, i * TILE + TILE / 2)
            }

            if (showTileValues) {
              p.fill(255)
              p.textSize(9)
              p.textAlign(p.LEFT, p.TOP)
              p.text(Number(content).toFixed(1), j * TILE + 2, i * TILE + 2)
              p.textAlign(p.RIGHT, p.BOTTOM)
              p.text(String(tilePopulation?.[i]?.[j] ?? 0), (j + 1) * TILE - 2, (i + 1) * TILE - 2)
              p.textAlign(p.CENTER, p.CENTER)
            }
          }
        }

        for (const bunny of bunnies ?? []) {
          const x = bunny.y * TILE + TILE / 2
          const y = bunny.x * TILE + TILE / 2
          p.fill(255)
          p.textSize(18)
          p.text('🐇', x, y)
          if (showStats) {
            p.textSize(8)
            p.textAlign(p.CENTER, p.BOTTOM)
            p.text(`#${bunny.id}`, x, y - 8)
            p.textAlign(p.CENTER, p.CENTER)
          }
        }
      }
    }, host)

    sketchRef.current = sketch
    return () => {
      sketchRef.current = null
      sketch.remove()
    }
  }, [])

  return <div ref={hostRef} />
}
