import { useEffect, useRef, useState } from 'react'

const SERVER_URL = 'ws://localhost:8080'

export default function useSimSocket() {
  const socketRef = useRef(null)
  const [world, setWorld] = useState({ width: 0, height: 0, tiles: [] })
  const [bunnies, setBunnies] = useState({})
  const [bunnyCount, setBunnyCount] = useState(0)

  useEffect(() => {
    const socket = new WebSocket(SERVER_URL)
    socketRef.current = socket

    socket.onopen = () => {
      console.log('Connected to the WebSocket server')
    }

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data)
      console.log(data)
      switch (data.event) {
        case 'bunny_update': {
          const { bunny } = data.data
          setBunnies((prev) => ({ ...prev, [bunny.id]: bunny }))
          break
        }
        case 'bunny_count_update':
          setBunnyCount(data.data.bunnyCount)
          break
        case 'world_update':
          setWorld(data.data.world)
          break
      }
    }

    socket.onerror = (error) => {
      console.error('WebSocket Error:', error)
    }

    socket.onclose = (event) => {
      console.log('Connection closed:', event)
    }

    return () => socket.close()
  }, [])

  const send = (event, data) => {
    const socket = socketRef.current
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ event, data }))
    }
  }

  return { world, bunnies: Object.values(bunnies), bunnyCount, send }
}
