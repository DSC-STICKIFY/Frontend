import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

window.Pusher = Pusher;

const echo = new Echo({
    broadcaster: 'pusher',
    key: import.meta.env.VITE_PUSHER_APP_KEY,
    cluster: import.meta.env.VITE_PUSHER_APP_CLUSTER,
    forceTLS: true,

    // Dynamic auth setup for Laravel Sanctum
    authEndpoint: `${import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'}/api/broadcasting/auth`,

    authorizer: (channel, options) => ({
        authorize: (socketId, callback) => {
            const token = getToken();   // ← Gamiton ang imong robust getToken()

            if (!token) {
                console.error("No auth token found for broadcasting");
                return callback(new Error("No token"), null);
            }

            fetch(`${import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'}/api/broadcasting/auth`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                    socket_id: socketId,
                    channel_name: channel.name,
                }),
            })
                .then(res => {
                    if (!res.ok) throw new Error(`Auth failed: ${res.status}`);
                    return res.json();
                })
                .then(data => {
                    console.log(`✅ Channel ${channel.name} authorized successfully`);
                    callback(null, data);
                })
                .catch(err => {
                    console.error(`❌ Channel authorization failed for ${channel.name}:`, err);
                    callback(err, null);
                });
        }
    }),
});

// Reuse your robust token getter from MessageAPI
function getToken() {
    const roleTokens = ["token_user", "token_admin", "token_subadmin"];
    for (const key of roleTokens) {
        const val = localStorage.getItem(key) || sessionStorage.getItem(key);
        if (val && val !== "null" && val !== "undefined") return val;
    }

    const genericKeys = ["token", "access_token", "auth_token", "authToken"];
    for (const key of genericKeys) {
        const val = localStorage.getItem(key) || sessionStorage.getItem(key);
        if (val && val !== "null" && val !== "undefined") return val;
    }

    console.warn("⚠️ No auth token found for Echo");
    return null;
}

export default echo;