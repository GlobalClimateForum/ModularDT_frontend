import { settings } from '@/utils/settings'


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

        eventSource.onerror = (error) => {
            if (eventSource.readyState === EventSource.CLOSED) {
                eventSource.close() // Close the EventSource connection if an error occurs and the connection is closed
                // If the EventSource is closed, reject the promise with an error message
                reject(new Error('EventSource connection was closed.'))
            }

        };
    })
};