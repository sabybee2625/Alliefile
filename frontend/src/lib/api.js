import axios from 'axios';

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth
export const authApi = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
};

// Dossiers
export const dossiersApi = {
  list: () => api.get('/dossiers'),
  get: (id) => api.get(`/dossiers/${id}`),
  create: (data) => api.post('/dossiers', data),
  update: (id, data) => api.put(`/dossiers/${id}`, data),
  delete: (id) => api.delete(`/dossiers/${id}`),
  renumber: (id) => api.post(`/dossiers/${id}/renumber`),
  getChronology: (id) => api.get(`/dossiers/${id}/chronology`),
  exportCsv: (id) => api.get(`/dossiers/${id}/export/csv`, { responseType: 'blob' }),
  exportZip: (id) => api.get(`/dossiers/${id}/export/zip`, { responseType: 'blob' }),
  createShareLink: (id, data) => api.post(`/dossiers/${id}/share`, data),
};

// Pieces
export const piecesApi = {
  list: (dossierId) => api.get(`/dossiers/${dossierId}/pieces`),
  get: (id) => api.get(`/pieces/${id}`),
  upload: (dossierId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/dossiers/${dossierId}/pieces`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  analyze: (id) => api.post(`/pieces/${id}/analyze`),
  validate: (id, data) => api.post(`/pieces/${id}/validate`, data),
  delete: (id) => api.delete(`/pieces/${id}`),
  getFileUrl: (id) => `${API_URL}/pieces/${id}/file`,
};

// Shared (public)
export const sharedApi = {
  getDossier: (token) => axios.get(`${API_URL}/shared/${token}`),
  getPieceFileUrl: (token, pieceId) => `${API_URL}/shared/${token}/piece/${pieceId}/file`,
};

export default api;
