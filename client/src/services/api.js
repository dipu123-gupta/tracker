import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json'
    }
});

export const createSession = (title) => api.post('/create-session', { title });
export const getSession = (id) => api.get(`/session/${id}`);
export const updateLocation = (sessionId, locationData) => api.post(`/location/${sessionId}`, locationData);
export const deleteSession = (sessionId) => api.delete(`/session/${sessionId}`);

export default api;
