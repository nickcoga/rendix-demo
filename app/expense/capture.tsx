import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useSQLiteContext } from 'expo-sqlite';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../src/constants/theme';
import { saveDraftPhoto, discardDraft, getFileBase64 } from '../../src/services/storage/photoStorage';
import { getProxyUrl } from '../../src/services/database/settingsService';
import { extractReceiptFromProxy } from '../../src/services/ai/geminiClient';
import { Button } from '../../src/components/Button';

export default function CaptureScreen() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const parsedTripId = parseInt(tripId || '0', 10);
  const router = useRouter();
  const db = useSQLiteContext();

  const [draftUri, setDraftUri] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  const requestPermissions = async (type: 'camera' | 'library') => {
    if (type === 'camera') {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permiso Requerido',
          'Rendix necesita acceso a la cámara para fotografiar facturas y tickets.'
        );
        return false;
      }
    } else {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permiso Requerido',
          'Rendix necesita acceso a la galería para seleccionar comprobantes.'
        );
        return false;
      }
    }
    return true;
  };

  const handleTakePhoto = async () => {
    const hasPermission = await requestPermissions('camera');
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.7, // Optimization for OCR & fast payload
        allowsEditing: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        // Save into private drafts directory
        const savedDraft = await saveDraftPhoto(result.assets[0].uri);
        setDraftUri(savedDraft);
      }
    } catch (err: any) {
      Alert.alert('Error', 'No se pudo abrir la cámara: ' + err.message);
    }
  };

  const handlePickFromGallery = async () => {
    const hasPermission = await requestPermissions('library');
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.7,
        allowsEditing: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const savedDraft = await saveDraftPhoto(result.assets[0].uri);
        setDraftUri(savedDraft);
      }
    } catch (err: any) {
      Alert.alert('Error', 'No se pudo seleccionar la imagen: ' + err.message);
    }
  };

  const handleRetake = () => {
    if (draftUri) {
      discardDraft(draftUri);
    }
    setDraftUri(null);
  };

  const handleAnalyzeWithAi = async () => {
    if (!draftUri) return;
    setAnalyzing(true);

    try {
      // 1. Get base64 string
      const base64Data = await getFileBase64(draftUri);
      // 2. Get proxy URL
      const proxyUrl = await getProxyUrl(db);

      // 3. Call AI extraction with 10s timeout
      const extractedData = await extractReceiptFromProxy(base64Data, proxyUrl);

      // 4. Navigate to review form with extracted data (or null if manual fallback)
      router.push({
        pathname: '/expense/form',
        params: {
          tripId: parsedTripId.toString(),
          draftUri: draftUri,
          aiData: extractedData ? JSON.stringify(extractedData) : '',
        },
      });
    } catch (err) {
      console.warn('Error en proceso de análisis:', err);
      // Seamless manual fallback: open form with the photo
      router.push({
        pathname: '/expense/form',
        params: {
          tripId: parsedTripId.toString(),
          draftUri: draftUri,
          aiData: '',
        },
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const handleManualEntry = () => {
    if (!draftUri) return;
    router.push({
      pathname: '/expense/form',
      params: {
        tripId: parsedTripId.toString(),
        draftUri: draftUri,
        aiData: '',
      },
    });
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {!draftUri ? (
          /* Selection Step */
          <View style={styles.pickerSection}>
            <View style={styles.iconCircle}>
              <Ionicons name="scan-outline" size={54} color={COLORS.primary} />
            </View>

            <Text style={styles.title}>Digitalizar Comprobante</Text>
            <Text style={styles.subtitle}>
              Fotografía una factura, boleta, ticket de peaje o pasaje. Rendix extraerá automáticamente el RUC, fecha, serie e importes.
            </Text>

            <View style={styles.optionsBox}>
              <Button
                title="Tomar Fotografía con Cámara"
                variant="primary"
                size="large"
                icon={<Ionicons name="camera" size={22} color={COLORS.accent} />}
                onPress={handleTakePhoto}
                style={{ marginBottom: 14 }}
              />

              <Button
                title="Seleccionar de la Galería"
                variant="outline"
                size="large"
                icon={<Ionicons name="images-outline" size={20} color={COLORS.primary} />}
                onPress={handlePickFromGallery}
              />
            </View>

            <View style={styles.tipBox}>
              <Ionicons name="bulb-outline" size={18} color="#D97706" style={{ marginRight: 8 }} />
              <Text style={styles.tipText}>
                Consejo: Asegura buena iluminación y que los números del comprobante se lean con nitidez.
              </Text>
            </View>
          </View>
        ) : (
          /* Preview Step */
          <View style={styles.previewSection}>
            <View style={styles.previewHeader}>
              <Text style={styles.previewTitle}>Vista Previa del Comprobante</Text>
              <Text style={styles.previewSub}>Verifica que el documento sea legible</Text>
            </View>

            <View style={styles.imageFrame}>
              <Image source={{ uri: draftUri }} style={styles.previewImage} />
            </View>

            {analyzing ? (
              <View style={styles.analyzingCard}>
                <ActivityIndicator size="large" color={COLORS.primary} style={{ marginBottom: 12 }} />
                <Text style={styles.analyzingTitle}>Extrayendo datos con Gemini IA...</Text>
                <Text style={styles.analyzingSub}>
                  Leyendo RUC, serie, fecha, base imponible e importes...
                </Text>
              </View>
            ) : (
              <View style={styles.previewActions}>
                <Button
                  title="Analizar con IA y Revisar"
                  variant="primary"
                  size="large"
                  icon={<Ionicons name="sparkles" size={20} color={COLORS.accent} />}
                  onPress={handleAnalyzeWithAi}
                  style={{ marginBottom: 10 }}
                />

                <View style={styles.secondaryActionsRow}>
                  <Button
                    title="Repetir Captura"
                    variant="outline"
                    icon={<Ionicons name="refresh-outline" size={16} color={COLORS.primary} />}
                    onPress={handleRetake}
                    style={{ flex: 1, marginRight: 6 }}
                  />

                  <Button
                    title="Ingreso Manual"
                    variant="secondary"
                    icon={<Ionicons name="create-outline" size={16} color={COLORS.textWhite} />}
                    onPress={handleManualEntry}
                    style={{ flex: 1, marginLeft: 6 }}
                  />
                </View>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    padding: 20,
    flexGrow: 1,
    justifyContent: 'center',
  },
  pickerSection: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.primary,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 30,
    paddingHorizontal: 10,
  },
  optionsBox: {
    width: '100%',
    marginBottom: 24,
  },
  tipBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FDE68A',
    width: '100%',
  },
  tipText: {
    fontSize: 12,
    color: '#92400E',
    flex: 1,
    lineHeight: 16,
  },
  previewSection: {
    flex: 1,
  },
  previewHeader: {
    marginBottom: 12,
  },
  previewTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.primary,
  },
  previewSub: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  imageFrame: {
    width: '100%',
    height: 380,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#000',
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    marginBottom: 16,
  },
  previewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  analyzingCard: {
    backgroundColor: COLORS.surface,
    padding: 24,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    elevation: 3,
  },
  analyzingTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.primary,
    marginBottom: 4,
  },
  analyzingSub: {
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  previewActions: {
    marginTop: 4,
  },
  secondaryActionsRow: {
    flexDirection: 'row',
  },
});
