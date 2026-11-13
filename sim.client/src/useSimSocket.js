import { useEffect, useRef, useState } from 'react'

const SERVER_URL = 'ws://localhost:8080'

export default function useSimSocket() {
  const socketRef = useRef(null)
  const [world, setWorld] = useState({ width: 0, height: 0, tiles: [] })
  const [bunnies, setBunnies] = useState([])
  const [tilesContent, setTilesContent] = useState([])
  const [history, setHistory] = useState([])
  useEffect(() => {
    const socket = new WebSocket(SERVER_URL)
    socketRef.current = socket

    socket.onopen = () => {
      console.log('Connected to the WebSocket server')
    }

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data)
      switch (data.event) {
        case 'world_init':
          setWorld(data.data)
          setTilesContent(data.data.tilesContent)
          break
        case 'tick':
          setBunnies(data.data.bunnies)
          setTilesContent(data.data.tilesContent)
          break
        case 'history':
          setHistory(data.data)
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

  return { world, bunnies, bunnyCount: bunnies.length, tilesContent, history, send }
}
