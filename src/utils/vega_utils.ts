import { settings } from '@/utils/settings'
import type { Parameter, Parameters } from '@/services/slide_service'


// FILTER KEY: ,atches a filter-style query like: filter[year] -> captures "filter", "year"
const FILTER_KEY = /^(\w+)\[(\w+)\]$/

export function sanitizeURL(url: string): string {

    // Remove leading and trailing whitespace
    let url_ = url.trim()

    // Remove any trailing slashes from the URL and the base URL from settings, if present
    const baseURL = settings.value.cs_url?.replace(/\/+$/, '')
    if (baseURL && url_.startsWith(baseURL)) url_ = url_.slice(baseURL.length)

    const qIndex = url_.indexOf('?') // Find the index of the query string in the URL (if any)
    let path = qIndex === -1 ? url_ : url_.slice(0, qIndex) // Extract the path portion of the URL (before the query string, if present)
    const query = qIndex === -1 ? '' : url_.slice(qIndex) // Extract the query string portion of the URL (if present)

    path = path.replace(/\/{2,}/g, '/').replace(/^\/+/, '').replace(/\/+$/, '') // Normalize the path by removing duplicate slashes and leading/trailing slashes
    return path + query
}

// Remove any filter-style query parameters from a URL
export function stripFilters(url: string): string {
    const parsed = new URL(url, window.location.origin)
    const params = new URLSearchParams(parsed.search)

    Array.from(params.keys()).forEach((key) => {
        if (key.match(FILTER_KEY)) params.delete(key)
    })

    const query = params.toString()
    return sanitizeURL(parsed.pathname + (query ? `?${query}` : ''))
}

// Build a URL pattern from a base URL and a set of filter parameters
export function buildPattern(baseUrl: string, parameters: Parameters): string {
    const parsed = new URL(baseUrl, window.location.origin)
    const params = new URLSearchParams(parsed.search)

    Object.keys(parameters).forEach((name) => {
        params.set(`filter[${name}]`, `<${name}>`)
    })

    const query = params.toString()
    return sanitizeURL(parsed.pathname + (query ? `?${query}` : ''))
}

// Infer a Parameter type from a raw query-string value
function inferType(value: string): Parameter['type'] {
    const v = value.toLowerCase()
    if (v === 'true' || v === 'false') return 'boolean'
    if (value.trim() !== '' && !isNaN(Number(value))) return 'number'
    return 'string'
}

function coerceValue(type: Parameter['type'], value: string): unknown {
    if (type === 'number') return Number(value)
    if (type === 'boolean') return value.toLowerCase() === 'true'
    return value
}

// Extract filter parameters from a URL: 
// Only 'filter[<name>]=<value>' style query parameters are extracted, and the <name> and <value> are used to construct a Parameters object.
// values are normalized to their inferred types
export function extractParameters(url: string): Parameters {

    const parsed = new URL(url, window.location.origin)
    const params = new URLSearchParams(parsed.search)
    const result: Parameters = {}

    params.forEach((value, key) => {
        const match = key.match(FILTER_KEY)
        if (!match) return

        const name = match[2]
        const type = inferType(value)
        const def = coerceValue(type, value)

        if (type === 'number') {
            result[name] = { type, default: def as number, range: { min: null, max: null } }
        } else {
            result[name] = { type, default: def } as Parameter
        }
    })

    return result
}

// Build a URL from a URL pattern and a set of filter values
export function buildVegaUrl(pattern: string, values: Record<string, unknown>): string {
    const parsed = new URL(pattern, window.location.origin)
    const params = new URLSearchParams(parsed.search)

    Array.from(params.keys()).forEach((key) => {
        const match = key.match(FILTER_KEY)
        if (!match) return // leave non-filter params untouched

        const name = match[2]
        const value = values[name]

        if (value === undefined || value === null || value === '') {
            params.delete(key)
            return
        }
        params.set(key, typeof value === 'boolean' ? String(value).toLowerCase() : String(value))
    })

    const query = params.toString()
    return sanitizeURL(parsed.pathname + (query ? `?${query}` : ''))
}

// Function to stream a Vega specification from the server using SSE
export function streamVegaSpec(
    url: string, // The sub-URL to fetch the Vega specification from
    onProgress: (progress: number) => void // Callback function to handle progress updates
): Promise<string> {
    return new Promise((resolve, reject) => {
        const fullUrl = `${settings.value.cs_url}/${url}` // Construct the full URL using the base URL from settings
        const eventSource = new EventSource(fullUrl) // Create a new EventSource to listen for server-sent events

        // Handle incoming messages from the SSE stream
        eventSource.onmessage = (event) => {
            let msg: any;

            // Attempt to parse the incoming message data as JSON
            try {
                msg = JSON.parse(event.data) // Parse the incoming message data as JSON
            } catch (error) {
                console.error('Error parsing message data:', error)
                return
            }

            // If the message contains a progress field, 
            // call the onProgress callback with the progress percentage
            if (msg.progress) {
                onProgress(Math.round(msg.progress * 100))
            } else if (!msg.progress && msg.config) {
                // If the message contains a config field, it indicates the final Vega specification has been received
                // - resolve the promise with the final Vega specification
                eventSource.close() // Close the EventSource connection when the final message is received
                resolve(JSON.stringify(msg, null, 2)) // Resolve the promise with the final Vega specification
            }
        };

        eventSource.onerror = () => {
            eventSource.close()
            reject(new Error('EventSource connection failed.'))
        };

})
};