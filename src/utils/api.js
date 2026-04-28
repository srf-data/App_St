/**
 * Utility to perform authenticated fetch requests to the API.
 * It automatically includes the JWT token from localStorage.
 */
export async function apiFetch(url, options = {}) {
    const token = localStorage.getItem('solart_token');
    
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
        ...options,
        headers,
    });

    // If unauthorized, we could trigger a logout here
    if (response.status === 401 || response.status === 403) {
        console.warn('[API] Unauthorized access detected. Status:', response.status);
        // localStorage.removeItem('solart_token');
        // window.location.reload(); // Or use a callback to App.jsx
    }

    return response;
}
