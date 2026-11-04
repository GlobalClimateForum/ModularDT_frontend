import { settings } from '@/globals/settings'

export function streamHTML(
    url: string,
    onProgress?: (progress: number) => void,
    onChunk?: (htmlSoFar: string) => void,
    signal?: AbortSignal                        // NEW
): Promise<string> {
    return new Promise((resolve, reject) => {
        const fullUrl = `${settings.value.cs_url}/${url}`
        const eventSource = new EventSource(fullUrl)
        let html = ''
        let finished = false

        const finish = (result: string) => {
            finished = true
            eventSource.close()
            resolve(result)
        }

        signal?.addEventListener('abort', () => {
            finished = true
            eventSource.close()
            reject(new DOMException('Aborted', 'AbortError'))
        })

        eventSource.onmessage = (event) => {
            let msg: any
            try {
                msg = JSON.parse(event.data)
            } catch (error) {
                console.error('Error parsing message data:', error)
                return
            }

            if ('progress' in msg) onProgress?.(Math.round(msg.progress * 100))

            if (typeof msg.chunk === 'string') {
                html += msg.chunk
                onChunk?.(html)
            }

            if (typeof msg.html === 'string') return finish(msg.html)
            if (msg.done) finish(html)
        }

        eventSource.onerror = () => {
            eventSource.close()
            if (!finished) reject(new Error('EventSource connection failed.'))
        }
    })
}