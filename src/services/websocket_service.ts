// services/websocketService.ts
import { reactive } from 'vue'

export function useWebsocketService() {
  const sockets = reactive<Record<string, WebSocket>>({})
  const listeners = reactive<Record<string, Record<string, Function[]>>>({})

  const emit = (channelId: string, event: string, data: any): void => {
    if (listeners[channelId]?.[event]) {
      listeners[channelId][event].forEach((callback) => callback(data))
    }
  }

  const connect = (channelId: string, url: string): void => {
    console.log(`Connect to channel `, url)
    if (sockets[channelId]) {
      console.log(`Already connected to channel ${channelId}`)
      return
    }

    sockets[channelId] = new WebSocket(url)
    listeners[channelId] = {}

    sockets[channelId].onopen = (event: Event) => {
      console.log(`Connected to channel ${channelId}:`, event)
      emit(channelId, 'open', event)
    }

    sockets[channelId].onmessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data)
        emit(channelId, 'message', data)
      } catch (e) {
        console.error('Error parsing WebSocket message:', e)
      }
    }

    sockets[channelId].onerror = (error: Event) => {
      console.error(`WebSocket Error on channel ${channelId}:`, error)
      emit(channelId, 'error', error)
    }

    sockets[channelId].onclose = (event: CloseEvent) => {
      console.log(`WebSocket closed on channel ${channelId}:`, event)
      delete sockets[channelId]
      delete listeners[channelId]
      emit(channelId, 'close', event)
    }
  }

  const send = (channelId: string, data: any): void => {
    if (sockets[channelId]?.readyState === WebSocket.OPEN) {
      sockets[channelId].send(JSON.stringify(data))
    } else {
      console.warn(`WebSocket channel ${channelId} is not connected`)
    }
  }

  const on = (channelId: string, event: string, callback: Function): void => {
    if (!listeners[channelId]) {
      listeners[channelId] = {}
    }
    if (!listeners[channelId][event]) {
      listeners[channelId][event] = []
    }
    listeners[channelId][event].push(callback)
  }

  const off = (channelId: string, event: string, callback: Function): void => {
    if (listeners[channelId]?.[event]) {
      listeners[channelId][event] = listeners[channelId][event].filter(
        (cb) => cb !== callback
      )
    }
  }

  const disconnect = (channelId: string): void => {
    if (sockets[channelId]) {
      sockets[channelId].close()
    }
  }

  const broadcastPattern = (pattern: string, data: any): void => {
    const regex = new RegExp(`^${pattern.replace('*', '[0-9]+')}$`)
    Object.keys(sockets).forEach(channelId => {
      if (regex.test(channelId)) {
        send(channelId, data)
      }
    })
  }

  const broadcastToChannels = (channelIds: string[], data: any): void => {
    channelIds.forEach(channelId => {
      send(channelId, data)
    })
  }

  const getActiveChannels = (filter?: string): string[] => {
    const channels = Object.keys(sockets)
    if (!filter) return channels

    const regex = new RegExp(`^${filter.replace('*', '[0-9]+')}$`)
    return channels.filter(ch => regex.test(ch))
  }

  return {
    sockets,
    listeners,
    connect,
    send,
    on,
    off,
    emit,
    disconnect,
    broadcastPattern,
    broadcastToChannels,
    getActiveChannels
  }
}
