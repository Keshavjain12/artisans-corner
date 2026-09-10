import api from './api.js';

const clean = (params = {}) =>
  Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== '' && value !== undefined && value !== null)
  );

export const catalogService = {
  listProducts: (params) => api.get('/products', { params: clean(params) }),
  getProduct: (idOrSlug) => api.get(`/products/${idOrSlug}`),
  getProductReviews: (id, params) => api.get(`/products/${id}/reviews`, { params: clean(params) }),
  listCategories: () => api.get('/categories'),
  listStores: (params) => api.get('/vendors', { params: clean(params) }),
  getStore: (slug) => api.get(`/vendors/${slug}`),
};

export default catalogService;
