import { apiRequest } from './client';

export const authApi = {
  async register(name, email, password) {
    return await apiRequest('/register', {
      method: 'POST',
      body: { name, email, password },
    });
  },

  async login(email, password) {
    return await apiRequest('/login', {
      method: 'POST',
      body: {
        email: email.trim(),
        password: password,
      },
    });
  },


  async getCurrentUser() {
    return await apiRequest('/me', {
      method: 'GET',
    });
  },
};
