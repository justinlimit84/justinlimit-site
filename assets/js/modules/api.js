/**
 * API module for backend communication
 */
export async function fetchChatResponse(payload) {
    const response = await fetch(`/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.error || 'API Error');
    }
    return data;
}
