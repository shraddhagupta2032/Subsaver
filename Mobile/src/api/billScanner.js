import { Platform } from 'react-native';
import { apiRequest } from './client';

export const billScannerApi = {
  /**
   * Uploads an image file to the AI bill scanner backend endpoint.
   * @param {Object} imageObj - { uri, name, type, file (web) }
   * @returns {Promise<Object>} BillScanResponse
   */
  async scanBill(imageObj) {
    const formData = new FormData();

    if (Platform.OS === 'web' && imageObj.file) {
      formData.append('file', imageObj.file);
    } else {
      const filename = imageObj.name || imageObj.uri?.split('/').pop() || 'uploaded_bill.jpg';
      const type = imageObj.type || (filename.endsWith('.png') ? 'image/png' : 'image/jpeg');

      // React Native FormData file format
      formData.append('file', {
        uri: Platform.OS === 'android' ? imageObj.uri : imageObj.uri.replace('file://', ''),
        name: filename,
        type: type,
      });
    }

    return await apiRequest('/bill-scanner/scan', {
      method: 'POST',
      body: formData,
    });
  },

  /**
   * Confirms the reviewed bill scan draft and creates the authoritative financial record.
   * @param {Object} confirmPayload - BillScanConfirmRequest
   * @returns {Promise<Object>} BillScanConfirmResponse
   */
  async confirmBill(confirmPayload) {
    return await apiRequest('/bill-scanner/confirm', {
      method: 'POST',
      body: confirmPayload,
    });
  },
};
