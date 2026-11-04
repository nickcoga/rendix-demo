import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, DEFAULT_PROXY_URL } from '../../src/constants/theme';
import {
  getProxyUrl,
  setProxyUrl,
  testProxyConnection,
} from '../../src/services/database/settingsService';
import { Button } from '../../src/components/Button';

export default function SettingsScreen() {
  const db = useSQLiteContext();
  const [proxyUrl, setProxyUrlState] = useState('');
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    async function load() {
      const url = await getProxyUrl(db);
      setProxyUrlState(url);
    }
    load();
  }, [db]);

  const handleTest = async () => {
    if (!proxyUrl.trim()) {
      Alert.alert('URL requerida', 'Por favor ingresa una URL válida.');
      return;
    }
    setTesting(true);
    setStatusMessage(null);
    try {
      const result = await testProxyConnection(proxyUrl.trim());
      setStatusMessage({ ok: result.ok, text: result.message });
    } catch {
      setStatusMessage({ ok: false, text: 'Error al contactar el servidor proxy.' });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    if (!proxyUrl.trim()) {
      Alert.alert('URL requerida', 'Por favor ingresa una URL válida.');
      return;
    }
    setSaving(true);
    try {
      await setProxyUrl(db, proxyUrl.trim());
      Alert.alert('Configuración Guardada', 'La URL del proxy se actualizó con éxito.');
    } catch (err: any) {
      Alert.alert('Error', 'No se pudo guardar la configuración: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    setProxyUrlState(DEFAULT_PROXY_URL);
    await setProxyUrl(db, DEFAULT_PROXY_URL);
    setStatusMessage(null);
    Alert.alert('Restablecido', 'Se restableció la URL del proxy al valor por defecto.');
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Security Banner */}
        <View style={styles.securityBox}>
          <Ionicons name="shield-checkmark" size={24} color={COLORS.primary} style={{ marginRight: 10 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.securityTitle}>Arquitectura Segura</Text>
            <Text style={styles.securitySub}>
              La clave secreta de Gemini reside exclusivamente en Vercel. Esta aplicación nunca solicita ni almacena API Keys.
            </Text>
          </View>
        </View>

        {/* Proxy URL Configuration Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>URL del Proxy de Extracción (IA)</Text>
          <Text style={styles.cardDesc}>
            Endpoint intermediario en Vercel encargado de procesar la extracción con Gemini 3.8 Flash.
          </Text>

          <View style={styles.inputWrapper}>
            <Ionicons name="link-outline" size={18} color={COLORS.textMuted} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="https://tu-proyecto.vercel.app/api/extract"
              placeholderTextColor={COLORS.textLight}
              autoCapitalize="none"
              autoCorrect={false}
              value={proxyUrl}
              onChangeText={setProxyUrlState}
            />
          </View>

          {statusMessage && (
            <View
              style={[
                styles.statusBox,
                statusMessage.ok ? styles.statusBoxSuccess : styles.statusBoxError,
              ]}
            >
              <Ionicons
                name={statusMessage.ok ? 'checkmark-circle' : 'alert-circle'}
                size={16}
                color={statusMessage.ok ? COLORS.success : COLORS.danger}
                style={{ marginRight: 6 }}
              />
              <Text
                style={[
                  styles.statusText,
                  { color: statusMessage.ok ? COLORS.success : COLORS.danger },
                ]}
              >
                {statusMessage.text}
              </Text>
            </View>
          )}

          <View style={styles.buttonsRow}>
            <Button
              title="Probar Conexión"
              variant="outline"
              size="normal"
              loading={testing}
              icon={<Ionicons name="pulse-outline" size={16} color={COLORS.primary} />}
              onPress={handleTest}
              style={{ flex: 1, marginRight: 6 }}
            />

            <Button
              title="Guardar"
              variant="primary"
              size="normal"
              loading={saving}
              onPress={handleSave}
              style={{ flex: 1, marginLeft: 6 }}
            />
          </View>

          <TouchableOpacity onPress={handleReset} style={styles.resetBtn}>
            <Text style={styles.resetBtnText}>Restablecer URL por defecto</Text>
          </TouchableOpacity>
        </View>

        {/* App Info Box */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Rendix Mobile Demo</Text>
          <Text style={styles.infoVersion}>Versión 1.0.0 (Demo Comercial)</Text>
          <Text style={styles.infoCompany}>Desarrollado para Softvalley</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    padding: 18,
    paddingBottom: 40,
  },
  securityBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  securityTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.primary,
    marginBottom: 2,
  },
  securitySub: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 16,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  cardDesc: {
    fontSize: 12,
    color: COLORS.textMuted,
    lineHeight: 17,
    marginBottom: 14,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    height: 46,
    fontSize: 13,
    color: COLORS.textPrimary,
  },
  statusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  statusBoxSuccess: {
    backgroundColor: COLORS.successLight,
  },
  statusBoxError: {
    backgroundColor: COLORS.dangerLight,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  buttonsRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  resetBtn: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  resetBtnText: {
    fontSize: 13,
    color: COLORS.primaryLight,
    fontWeight: '600',
  },
  infoCard: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.primary,
  },
  infoVersion: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  infoCompany: {
    fontSize: 11,
    color: COLORS.textLight,
    marginTop: 2,
  },
});
