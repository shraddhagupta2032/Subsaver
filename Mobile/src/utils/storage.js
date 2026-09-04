import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = '@subsaver_auth_token';
const USER_KEY = '@subsaver_user_data';
const BASE_URL_KEY = '@subsaver_api_base_url';

export const storage = {
  async saveToken(token) {
    try {
      if (token) {
        await AsyncStorage.setItem(TOKEN_KEY, token);
      } else {
        await AsyncStorage.removeItem(TOKEN_KEY);
      }
    } catch (e) {
      console.warn('Storage saveToken error:', e);
    }
  },

  async getToken() {
    try {
      return await AsyncStorage.getItem(TOKEN_KEY);
    } catch (e) {
      console.warn('Storage getToken error:', e);
      return null;
    }
  },

  async removeToken() {
    try {
      await AsyncStorage.removeItem(TOKEN_KEY);
    } catch (e) {
      console.warn('Storage removeToken error:', e);
    }
  },

  async saveUser(user) {
    try {
      if (user) {
        await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
      } else {
        await AsyncStorage.removeItem(USER_KEY);
      }
    } catch (e) {
      console.warn('Storage saveUser error:', e);
    }
  },

  async getUser() {
    try {
      const data = await AsyncStorage.getItem(USER_KEY);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.warn('Storage getUser error:', e);
      return null;
    }
  },

  async saveApiBaseUrl(url) {
    try {
      if (url) {
        await AsyncStorage.setItem(BASE_URL_KEY, url);
      }
    } catch (e) {
      console.warn('Storage saveApiBaseUrl error:', e);
    }
  },

  async getApiBaseUrl() {
    try {
      return await AsyncStorage.getItem(BASE_URL_KEY);
    } catch (e) {
      return null;
    }
  },

  async clearAll() {
    try {
      await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
    } catch (e) {
      console.warn('Storage clearAll error:', e);
    }
  }
};
