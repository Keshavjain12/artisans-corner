import api from './api.js';

export const vendorService = {
  onboard: (payload) => api.post('/vendors/onboard', payload),
  myStore: () => api.get('/vendors/me'),
  updateStore: (payload) => api.put('/vendors/me', payload),
  analytics: (range) => api.get('/vendors/me/analytics', { params: { range } }),
  orders: (params) => api.get('/vendors/me/orders', { params }),
  payouts: (params) => api.get('/vendors/me/payouts', { params }),

  myProducts: (params) => api.get('/products/mine', { params }),
  getProduct: (id) => api.get(`/products/mine/${id}`),
  createProduct: (payload) => api.post('/products', payload),
  updateProduct: (id, payload) => api.put(`/products/${id}`, payload),
  deleteProduct: (id) => api.delete(`/products/${id}`),
};

export const uploadService = {
  productImages: (files, onProgress) => {
    const form = new FormData();
    [...files].forEach((file) => form.append('images', file));
    return api.post('/uploads/products', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (event) => {
        if (onProgress && event.total) onProgress(Math.round((event.loaded / event.total) * 100));
      },
    });
  },
  storeImage: (file) => {
    const form = new FormData();
    form.append('images', file);
    return api.post('/uploads/store', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

export default vendorService;
