
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

    
    if (response.status === 401 || response.status === 403) {
        console.warn('[API] Unauthorized access detected. Status:', response.status);
        
        
    }

    return response;
}
