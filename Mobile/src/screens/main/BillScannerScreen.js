import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { billScannerApi } from '../../api/billScanner';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { colors } from '../../theme/colors';

export const BillScannerScreen = ({ navigation }) => {
  const [selectedImage, setSelectedImage] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState(null);

  const requestPermissionAndPick = async (mode) => {
    try {
      setError(null);
      if (mode === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(
            'Camera Permission Required',
            'Please enable camera permissions in your device settings to take receipt photos.'
          );
          return;
        }
        const result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          quality: 0.8,
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
          const asset = result.assets[0];
          setSelectedImage({
            uri: asset.uri,
            name: asset.fileName || `bill_${Date.now()}.jpg`,
            type: asset.mimeType || 'image/jpeg',
            file: asset.file,
          });
        }
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(
            'Gallery Permission Required',
            'Please enable photo library permissions in your device settings to upload bills.'
          );
          return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          quality: 0.8,
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
          const asset = result.assets[0];
          setSelectedImage({
            uri: asset.uri,
            name: asset.fileName || `bill_${Date.now()}.jpg`,
            type: asset.mimeType || 'image/jpeg',
            file: asset.file,
          });
        }
      }
    } catch (err) {
      console.warn('Image picker error:', err);
      setError('Failed to select image. Please try again.');
    }
  };

  const handleScan = async () => {
    if (!selectedImage) {
      setError('Please select or capture a bill image first.');
      return;
    }

    try {
      setScanning(true);
      setError(null);

      const response = await billScannerApi.scanBill(selectedImage);

      if (!response || !response.extracted_data) {
        throw new Error('AI was unable to extract financial data from this image.');
      }

      navigation.navigate('BillReview', {
        scanResult: response,
        imageUri: selectedImage.uri,
      });
    } catch (err) {
      console.warn('scanBill error:', err);
      setError(err.message || 'AI Bill scanning failed. Please ensure the document is clear and readable.');
    } finally {
      setScanning(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>AI Bill Scanner</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Intro Card */}
        <Card style={styles.introCard}>
          <View style={styles.introIconRow}>
            <View style={styles.iconCircle}>
              <Ionicons name="scan" size={28} color={colors.primary} />
            </View>
            <View style={styles.introTextCol}>
              <Text style={styles.introTitle}>Smart Receipt & Invoice OCR</Text>
              <Text style={styles.introSubtitle}>
                Snap any receipt, electricity bill, or SaaS invoice. Google Gemini AI automatically extracts amounts, merchants, dates, and recurring cycles for your review.
              </Text>
            </View>
          </View>
        </Card>

        {error && (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle-outline" size={20} color={colors.danger} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Image Selection Card */}
        <Card style={styles.pickerCard}>
          {selectedImage ? (
            <View style={styles.previewContainer}>
              <Image
                source={{ uri: selectedImage.uri }}
                style={styles.previewImage}
                resizeMode="cover"
              />
              <View style={styles.previewActions}>
                <TouchableOpacity
                  style={styles.changeImageBtn}
                  onPress={() => setSelectedImage(null)}
                >
                  <Ionicons name="trash-outline" size={18} color={colors.danger} />
                  <Text style={styles.changeImageText}>Remove</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.placeholderContainer}>
              <View style={styles.cameraIconBox}>
                <Ionicons name="document-text-outline" size={44} color={colors.textMuted} />
              </View>
              <Text style={styles.placeholderTitle}>No document selected</Text>
              <Text style={styles.placeholderSubtitle}>
                Take a photo or choose an invoice / receipt image from your gallery.
              </Text>

              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={styles.pickButton}
                  onPress={() => requestPermissionAndPick('camera')}
                >
                  <Ionicons name="camera" size={20} color="#FFFFFF" />
                  <Text style={styles.pickButtonText}>Camera</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.pickButton, styles.galleryButton]}
                  onPress={() => requestPermissionAndPick('gallery')}
                >
                  <Ionicons name="images" size={20} color={colors.primary} />
                  <Text style={[styles.pickButtonText, styles.galleryButtonText]}>
                    Gallery
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </Card>

        {/* Scan CTA */}
        {selectedImage && (
          <View style={styles.ctaContainer}>
            <Button
              title={scanning ? 'Scanning Document...' : 'Scan & Extract with AI'}
              onPress={handleScan}
              loading={scanning}
              style={styles.scanButton}
            />
          </View>
        )}

        {/* Processing Indicator Banner */}
        {scanning && (
          <Card style={styles.scanningBanner}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.scanningTitle}>Processing Document with AI</Text>
            <Text style={styles.scanningSubtitle}>
              Extracting merchant, totals, renewal dates, and billing cycle. This takes 2-3 seconds...
            </Text>
          </Card>
        )}

        {/* Safety Note */}
        <View style={styles.safetyBox}>
          <Ionicons name="shield-checkmark-outline" size={18} color={colors.success} />
          <Text style={styles.safetyText}>
            <Text style={{ fontWeight: '700' }}>Financial Safety Guarantee:</Text> AI never creates records directly. You will be able to review, edit, and confirm every field before saving.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  introCard: {
    marginBottom: 16,
    padding: 16,
  },
  introIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  introTextCol: {
    flex: 1,
  },
  introTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  introSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 17,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.dangerBg,
    borderColor: colors.danger,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
    marginLeft: 8,
    flex: 1,
  },
  pickerCard: {
    marginBottom: 16,
    padding: 16,
    alignItems: 'center',
    minHeight: 240,
    justifyContent: 'center',
  },
  placeholderContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    width: '100%',
  },
  cameraIconBox: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  placeholderTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6,
  },
  placeholderSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 20,
    lineHeight: 18,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  pickButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  pickButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 8,
  },
  galleryButton: {
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.border,
  },
  galleryButtonText: {
    color: colors.text,
  },
  previewContainer: {
    width: '100%',
    alignItems: 'center',
  },
  previewImage: {
    width: '100%',
    height: 240,
    borderRadius: 12,
  },
  previewActions: {
    flexDirection: 'row',
    marginTop: 12,
  },
  changeImageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.dangerBg,
  },
  changeImageText: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
  ctaContainer: {
    marginBottom: 16,
  },
  scanButton: {
    marginBottom: 0,
  },
  scanningBanner: {
    alignItems: 'center',
    padding: 24,
    marginBottom: 16,
  },
  scanningTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginTop: 14,
    marginBottom: 4,
  },
  scanningSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  safetyBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderColor: 'rgba(16, 185, 129, 0.2)',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  safetyText: {
    color: colors.textSecondary,
    fontSize: 12,
    marginLeft: 8,
    flex: 1,
    lineHeight: 17,
  },
});
