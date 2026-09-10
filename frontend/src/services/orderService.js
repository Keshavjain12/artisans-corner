import api from './api.js';

export const orderService = {
  myOrders: (params) => api.get('/orders/my-orders', { params }),
  getOrder: (id) => api.get(`/orders/${id}`),
  cancelOrder: (id) => api.post(`/orders/${id}/cancel`),
  updateStatus: (id, payload) => api.put(`/orders/${id}/status`, payload),
};

export const paymentService = {
  config: () => api.get('/payments/config'),
  quote: (items) => api.post('/payments/quote', { items }),
  createIntent: (payload) => api.post('/payments/create-intent', payload),
  confirm: (paymentIntentId) => api.post('/payments/confirm', { paymentIntentId }),
};

export const reviewService = {
  create: (payload) => api.post('/reviews', payload),
  update: (id, payload) => api.put(`/reviews/${id}`, payload),
  remove: (id) => api.delete(`/reviews/${id}`),
  pending: () => api.get('/reviews/pending'),
};

export default orderService;
