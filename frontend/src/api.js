import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8000/api/',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  // Keep the old custom headers just in case we need them or backward compatibility
  const userStr = localStorage.getItem('user');
  if (userStr) {
    try {
      const user = JSON.parse(userStr);
      if (user.doctor_id) config.headers['X-Doctor-ID'] = user.doctor_id;
      if (user.patient_id) config.headers['X-Patient-ID'] = user.patient_id;
    } catch(e) {}
  }
  
  return config;
});

export default api;
