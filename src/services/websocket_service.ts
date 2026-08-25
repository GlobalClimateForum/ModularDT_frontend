// services/websocketService.ts

class WebSocketService {
  private sockets: Record<string, WebSocket> = {}
  private listeners: Record<string, Record<string, Function[]>> = {}

  connect(channelId: string, url: string): void {
    console.log(`Connect to channel `, url)
    if (this.sockets[channelId]) {
      console.log(`Already connected to channel ${channelId}`)
      return
    }

    this.sockets[channelId] = new WebSocket(url)
    this.listeners[channelId] = {}

    this.sockets[channelId].onopen = (event: Event) => {
      console.log(`Connected to channel ${channelId}:`, event)
      this.emit(channelId, 'open', event)
    }

    this.sockets[channelId].onmessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data)
        this.emit(channelId, 'message', data)
      } catch (e) {
        console.error('Error parsing WebSocket message:', e)
      }
    }

    this.sockets[channelId].onerror = (error: Event) => {
      console.error(`WebSocket Error on channel ${channelId}:`, error)
      this.emit(channelId, 'error', error)
    }

    this.sockets[channelId].onclose = (event: CloseEvent) => {
      console.log(`WebSocket closed on channel ${channelId}:`, event)
      delete this.sockets[channelId]
      delete this.listeners[channelId]
      this.emit(channelId, 'close', event)
    }
  }

  send(channelId: string, data: any): void {
    if (this.sockets[channelId]?.readyState === WebSocket.OPEN) {
      this.sockets[channelId].send(JSON.stringify(data))
    } else {
      console.warn(`WebSocket channel ${channelId} is not connected`)
    }
  }

  on(channelId: string, event: string, callback: Function): void {
    if (!this.listeners[channelId]) {
      this.listeners[channelId] = {}
    }
    if (!this.listeners[channelId][event]) {
      this.listeners[channelId][event] = []
    }
    this.listeners[channelId][event].push(callback)
  }

  off(channelId: string, event: string, callback: Function): void {
    if (this.listeners[channelId]?.[event]) {
      this.listeners[channelId][event] = this.listeners[channelId][event].filter(
        (cb) => cb !== callback
      )
    }
  }

  emit(channelId: string, event: string, data: any): void {
    if (this.listeners[channelId]?.[event]) {
      this.listeners[channelId][event].forEach((callback) => callback(data))
    }
  }

  disconnect(channelId: string): void {
    if (this.sockets[channelId]) {
      this.sockets[channelId].close()
    }
  }

  /**
   * Send a message to all channels matching the pattern
   * e.g. broadcast('monitor/* /', data) sends to all monitor_X channels
   */
  broadcastPattern(pattern: string, data: any): void {
    const regex = new RegExp(`^${pattern.replace('*', '[0-9]+')}$`)

    Object.keys(this.sockets).forEach(channelId => {
      if (regex.test(channelId)) {
        this.send(channelId, data)
      }
    })
  }

  /**
   * Sends to spezific Channel-IDs
   */
  broadcastToChannels(channelIds: string[], data: any): void {
    channelIds.forEach(channelId => {
      this.send(channelId, data)
    })
  }

  /**
   * returns all active channels
   */

  getActiveChannels(filter?: string): string[] {
    const channels = Object.keys(this.sockets)
    if (!filter) return channels

    const regex = new RegExp(`^${filter.replace('*', '[0-9]+')}$`)
    return channels.filter(ch => regex.test(ch))
  }
}

export default new WebSocketService()

