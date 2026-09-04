import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { storage } from '../utils/storage';

// Auto-detect backend host when running in Expo Go on physical devices
const getExpoHostUrl = () => {
  try {
    const hostUri =
      Constants?.expoConfig?.hostUri ||
      Constants?.manifest2?.extra?.expoGo?.debuggerHost ||
      Constants?.manifest?.debuggerHost;
    if (hostUri) {
      const ip = hostUri.split(':')[0];
      if (ip && ip !== 'localhost' && ip !== '127.0.0.1') {
        return `http://${ip}:8000`;
      }
    }
  } catch {
    // Ignore error and use default
  }
  return null;
};

// Default base URL: auto-detected Expo IP, Android emulator (10.0.2.2), or localhost
const DEFAULT_URL =
  getExpoHostUrl() ||
  (Platform.OS === 'android' ? 'http://10.0.2.2:8000' : 'http://localhost:8000');

let dynamicBaseUrl = null;
let unauthorizedHandler = null;

export const setApiBaseUrl = (url) => {
  dynamicBaseUrl = url;
};

export const setUnauthorizedHandler = (handler) => {
  unauthorizedHandler = handler;
};

export const getApiBaseUrl = () => {
  return dynamicBaseUrl || DEFAULT_URL;
};


export async function apiRequest(endpoint, options = {}) {
  const baseUrl = dynamicBaseUrl || (await storage.getApiBaseUrl()) || DEFAULT_URL;
  const url = `${baseUrl.replace(/\/$/, '')}/${endpoint.replace(/^\//, '')}`;

  const token = await storage.getToken();
  const headers = {
    Accept: 'application/json',
    ...(options.headers || {}),
  };

  if (token && !headers.Authorization) {
    headers.Authorization = `Bearer ${token}`;
  }

  let body = options.body;
  if (body && typeof body === 'object' && !(body instanceof FormData) && !(body instanceof URLSearchParams)) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(body);
  }

  const fetchOptions = {
    method: options.method || 'GET',
    headers,
    body,
  };

  try {
    const response = await fetch(url, fetchOptions);

    if (response.status === 401) {
      if (unauthorizedHandler) {
        unauthorizedHandler();
      }
    }

    const contentType = response.headers.get('content-type') || '';
    let responseData = null;

    if (contentType.includes('application/json')) {
      responseData = await response.json();
    } else {
      const text = await response.text();
      try {
        responseData = JSON.parse(text);
      } catch {
        responseData = text;
      }
    }

    if (!response.ok) {
      let errorMessage = 'An error occurred while processing your request.';

      if (responseData) {
        if (typeof responseData.detail === 'string') {
          errorMessage = responseData.detail;
        } else if (Array.isArray(responseData.detail)) {
          errorMessage = responseData.detail
            .map((err) => `${err.loc ? err.loc.join('.') + ': ' : ''}${err.msg}`)
            .join('\n');
        } else if (responseData.message) {
          errorMessage = responseData.message;
        }
      }

      const error = new Error(errorMessage);
      error.status = response.status;
      error.data = responseData;
      throw error;
    }

    return responseData;
  } catch (error) {
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      const networkError = new Error(`Cannot connect to server at ${baseUrl}. Please check your connection or backend status.`);
      networkError.isNetworkError = true;
      throw networkError;
    }
    throw error;
  }
}
