import api from './api.js';

export const adminService = {
  users: (params) => api.get('/admin/users', { params }),
  updateUser: (id, payload) => api.put(`/admin/users/${id}`, payload),
  vendors: (params) => api.get('/admin/vendors', { params }),
  setVendorStatus: (id, payload) => api.put(`/admin/vendors/${id}/status`, payload),
  products: (params) => api.get('/admin/products', { params }),
  setProductStatus: (id, payload) => api.put(`/admin/products/${id}/status`, payload),
  orders: (params) => api.get('/admin/orders', { params }),
  revenue: (params) => api.get('/admin/revenue', { params }),
  settlePayout: (id) => api.put(`/admin/payouts/${id}/settle`),
  analytics: (range) => api.get('/admin/analytics', { params: { range } }),
};

export default adminService;
