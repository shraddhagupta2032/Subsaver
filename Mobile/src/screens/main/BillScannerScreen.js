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
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { billScannerApi } from '../../api/billScanner';
import { ScreenHeader } from '../../components/ScreenHeader';
import { Button } from '../../components/Button';
import { colors } from '../../theme/colors';

export const BillScannerScreen = ({ navigation }) => {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;

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

  const handleProcessBill = async () => {
    if (!selectedImage) return;

    try {
      setScanning(true);
      setError(null);

      const parsedBill = await billScannerApi.scanBillImage(selectedImage);

      navigation.navigate('BillReview', {
        scanResult: parsedBill,
        imageUri: selectedImage.uri,
      });
    } catch (err) {
      console.warn('Bill scanning failed:', err);
      setError(
        err.message ||
          'Failed to extract receipt data with AI. Make sure text and totals are legible.'
      );
    } finally {
      setScanning(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={[styles.headerContainer, { maxWidth: isDesktop ? 680 : '100%' }]}>
        <ScreenHeader
          title="AI bill scanner"
          subtitle="Turn any bill into an expense."
          back
          onBack={() => navigation.goBack()}
        />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={[
          styles.scrollContent,
          { maxWidth: isDesktop ? 680 : '100%', paddingHorizontal: isDesktop ? 24 : 16 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Scanner Viewfinder Box (matching Figma scanner-frame) */}
        <View style={styles.scannerFrame}>
          {/* Corner brackets */}
          <View style={[styles.corner, styles.cornerTL]} />
          <View style={[styles.corner, styles.cornerTR]} />
          <View style={[styles.corner, styles.cornerBL]} />
          <View style={[styles.corner, styles.cornerBR]} />

          {selectedImage ? (
            <Image
              source={{ uri: selectedImage.uri }}
              style={styles.previewImage}
              resizeMode="contain"
            />
          ) : (
            <View style={styles.receiptVisual}>
              <View style={styles.receiptHeader}>
                <Ionicons name="sparkles" size={16} color={colors.primary} />
                <Text style={styles.receiptStoreName}>HALDIRAM’S</Text>
              </View>
              <View style={styles.receiptSkeletonLine} />
              <View style={[styles.receiptSkeletonLine, { width: '70%' }]} />
              <View style={[styles.receiptSkeletonLine, { width: '50%' }]} />
              <Text style={styles.receiptMockTotal}>₹1,240.00</Text>
            </View>
          )}

          {scanning && (
            <View style={styles.scanningOverlay}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.scanningText}>AI is reading receipt line items...</Text>
            </View>
          )}
        </View>

        <Text style={styles.instructionTitle}>Position the bill inside the frame</Text>
        <Text style={styles.instructionSub}>
          Make sure the merchant name, total amount, taxes, and items are clearly visible.
        </Text>

        {error && (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle-outline" size={18} color={colors.danger} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Action Controls */}
        <View style={styles.actionsContainer}>
          <View style={styles.pickButtonsRow}>
            <TouchableOpacity
              style={styles.pickBtn}
              onPress={() => requestPermissionAndPick('camera')}
              activeOpacity={0.8}
            >
              <Ionicons name="camera-outline" size={20} color={colors.primary} />
              <Text style={styles.pickBtnText}>Camera</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.pickBtn}
              onPress={() => requestPermissionAndPick('gallery')}
              activeOpacity={0.8}
            >
              <Ionicons name="images-outline" size={20} color={colors.primary} />
              <Text style={styles.pickBtnText}>Gallery</Text>
            </TouchableOpacity>
          </View>

          {selectedImage && (
            <Button
              title="Extract Bill with AI"
              onPress={handleProcessBill}
              loading={scanning}
              icon={<Ionicons name="sparkles" size={18} color="#FFFFFF" />}
              style={{ marginTop: 12 }}
            />
          )}
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
  headerContainer: {
    paddingHorizontal: 20,
    width: '100%',
    alignSelf: 'center',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 110,
    width: '100%',
    alignSelf: 'center',
    alignItems: 'center',
  },
  scannerFrame: {
    width: '100%',
    height: 280,
    backgroundColor: colors.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 16,
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#183129',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 3,
  },
  corner: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderColor: colors.primary,
  },
  cornerTL: {
    top: 14,
    left: 14,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderTopLeftRadius: 6,
  },
  cornerTR: {
    top: 14,
    right: 14,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderTopRightRadius: 6,
  },
  cornerBL: {
    bottom: 14,
    left: 14,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderBottomLeftRadius: 6,
  },
  cornerBR: {
    bottom: 14,
    right: 14,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderBottomRightRadius: 6,
  },
  receiptVisual: {
    width: 170,
    backgroundColor: colors.surfaceLight,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    alignItems: 'center',
  },
  receiptHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  receiptStoreName: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 0.8,
  },
  receiptSkeletonLine: {
    width: '85%',
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.border,
    marginBottom: 8,
  },
  receiptMockTotal: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    marginTop: 8,
    letterSpacing: -0.3,
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  scanningOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.88)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanningText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 12,
  },
  instructionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  instructionSub: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
    maxWidth: 320,
  },
  actionsContainer: {
    width: '100%',
  },
  pickButtonsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  pickBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingVertical: 14,
    gap: 8,
    shadowColor: '#183129',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  pickBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.dangerBg,
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    width: '100%',
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
    marginLeft: 8,
    flex: 1,
  },
});
