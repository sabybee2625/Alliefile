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
  exportPdf: (id) => api.get(`/dossiers/${id}/export/pdf`, { responseType: 'blob' }),
  exportDocx: (id) => api.get(`/dossiers/${id}/export/docx`, { responseType: 'blob' }),
  createShareLink: (id, data) => api.post(`/dossiers/${id}/share`, data),
  generateAssistant: (id, data) => api.post(`/dossiers/${id}/assistant`, data),
  // Queue management
  queueAnalysis: (id, pieceIds = []) => api.post(`/dossiers/${id}/queue-analysis`, { piece_ids: pieceIds }),
  queueFailed: (id) => api.post(`/dossiers/${id}/queue-failed`),
  processQueue: (id) => api.post(`/dossiers/${id}/process-queue`),
  getQueueStatus: (id) => api.get(`/dossiers/${id}/queue-status`),
  // Duplicate check
  checkDuplicate: (id, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/dossiers/${id}/check-duplicate`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

// Pieces
export const piecesApi = {
  list: (dossierId, filters = {}) => {
    const params = new URLSearchParams();
    if (filters.duplicates) params.append('filter_duplicates', 'true');
    if (filters.errors) params.append('filter_errors', 'true');
    return api.get(`/dossiers/${dossierId}/pieces?${params.toString()}`);
  },
  get: (id) => api.get(`/pieces/${id}`),
  upload: async (dossierId, file, forceUpload = false) => {
    const formData = new FormData();
    formData.append('file', file);
    
    // Build query params
    const params = new URLSearchParams();
    if (forceUpload) params.append('force_upload', 'true');
    if (file.isFromCamera) params.append('source', 'camera');
    
    try {
      return await api.post(`/dossiers/${dossierId}/pieces?${params.toString()}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    } catch (error) {
      // Enrich error with duplicate details if 409
      if (error.response?.status === 409) {
        const detail = error.response.data?.detail;
        if (typeof detail === 'object') {
          error.duplicateInfo = {
            existingPieceId: detail.existing_piece_id,
            existingPieceNumero: detail.existing_piece_numero,
            existingFilename: detail.existing_filename,
            message: detail.message,
          };
        }
      }
      throw error;
    }
  },
  analyze: (id) => api.post(`/pieces/${id}/analyze`),
  reanalyze: (id) => api.post(`/pieces/${id}/reanalyze`),
  validate: (id, data) => api.post(`/pieces/${id}/validate`, data),
  delete: (id) => api.delete(`/pieces/${id}`),
  deleteMany: (dossierId, pieceIds) => api.post(`/dossiers/${dossierId}/pieces/delete-many`, { piece_ids: pieceIds }),
  deleteErrors: (dossierId) => api.post(`/dossiers/${dossierId}/pieces/delete-errors`),
  // File access with auth
  getFileUrl: (id) => `${API_URL}/pieces/${id}/file`,
  getPreviewUrl: (id) => `${API_URL}/pieces/${id}/preview`,
  // Fetch file with auth header (for inline preview)
  fetchFile: async (id) => {
    const response = await api.get(`/pieces/${id}/preview`, { responseType: 'blob' });
    return response.data;
  },
  downloadFile: async (id, filename) => {
    const response = await api.get(`/pieces/${id}/file`, { responseType: 'blob' });
    const url = window.URL.createObjectURL(response.data);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },
};

// Shared (public)
export const sharedApi = {
  getDossier: (token) => axios.get(`${API_URL}/shared/${token}`),
  getPieceFileUrl: (token, pieceId) => `${API_URL}/shared/${token}/piece/${pieceId}/file`,
  getChronologyPdfUrl: (token) => `${API_URL}/shared/${token}/export/pdf`,
};

// User stats & subscription
export const userApi = {
  getStats: () => api.get('/auth/stats'),
  getPlans: () => api.get('/payments/plans'),
  createCheckout: (planId, billingPeriod, promoCode = null) => 
    api.post('/payments/checkout', {
      plan_id: planId,
      billing_period: billingPeriod,
      promo_code: promoCode,
    }),
  checkPaymentStatus: (sessionId) => api.get(`/payments/status/${sessionId}`),
  validatePromoCode: (code, planId) => 
    api.post('/payments/validate-promo', { code, plan_id: planId }),
  activateBetaCode: (code) => api.post('/beta/activate', { code }),
  deleteAccount: (immediate = false) => api.delete(`/account?immediate=${immediate}`),
  cancelDeletion: () => api.post('/account/cancel-deletion'),
};

export default api;
