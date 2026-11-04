import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../src/constants/theme';
import { createTrip } from '../../src/services/database/tripService';
import { Button } from '../../src/components/Button';

export default function NewTripScreen() {
  const router = useRouter();
  const db = useSQLiteContext();

  const today = new Date().toISOString().split('T')[0];
  const nextThreeDays = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];

  const [technicianName, setTechnicianName] = useState('');
  const [destination, setDestination] = useState('');
  const [reason, setReason] = useState('');
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(nextThreeDays);
  const [advanceAmount, setAdvanceAmount] = useState('');
  const [currency] = useState('PEN');
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!technicianName.trim()) {
      Alert.alert('Campo Requerido', 'Por favor ingresa el nombre del técnico responsable.');
      return;
    }
    if (!destination.trim()) {
      Alert.alert('Campo Requerido', 'Por favor ingresa la ciudad o destino del viaje.');
      return;
    }
    if (!reason.trim()) {
      Alert.alert('Campo Requerido', 'Por favor describe el motivo o proyecto del viaje.');
      return;
    }

    const numericAdvance = parseFloat(advanceAmount.replace(',', '.')) || 0;

    setLoading(true);
    try {
      const newTripId = await createTrip(db, {
        technician_name: technicianName,
        destination: destination,
        reason: reason,
        start_date: startDate,
        end_date: endDate,
        advance_amount: numericAdvance,
        currency: currency,
      });

      // Navigate to the newly created trip
      router.replace(`/trip/${newTripId}`);
    } catch (err: any) {
      Alert.alert('Error', 'No se pudo crear la rendición: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Header Info */}
        <View style={styles.introBox}>
          <Ionicons name="airplane-outline" size={24} color={COLORS.primary} style={styles.introIcon} />
          <View style={styles.introTextBox}>
            <Text style={styles.introTitle}>Datos del Viaje y Adelanto</Text>
            <Text style={styles.introSub}>
              Registra los viáticos asignados para iniciar la rendición de comprobantes.
            </Text>
          </View>
        </View>

        {/* Form Fields */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Nombre del Técnico / Responsable *</Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="person-outline" size={18} color={COLORS.textMuted} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Ej: Carlos Mendoza Ramos"
              placeholderTextColor={COLORS.textLight}
              value={technicianName}
              onChangeText={setTechnicianName}
            />
          </View>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Destino del Viaje *</Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="location-outline" size={18} color={COLORS.textMuted} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Ej: Arequipa / Mina Cerro Verde"
              placeholderTextColor={COLORS.textLight}
              value={destination}
              onChangeText={setDestination}
            />
          </View>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Motivo del Viaje / Proyecto *</Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="document-text-outline" size={18} color={COLORS.textMuted} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, styles.multilineInput]}
              placeholder="Ej: Mantenimiento preventivo de transformadores y calibración"
              placeholderTextColor={COLORS.textLight}
              value={reason}
              onChangeText={setReason}
              multiline
              numberOfLines={2}
            />
          </View>
        </View>

        {/* Date Row */}
        <View style={styles.row}>
          <View style={[styles.fieldGroup, { flex: 1, marginRight: 8 }]}>
            <Text style={styles.label}>Fecha Inicio</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="calendar-outline" size={16} color={COLORS.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="AAAA-MM-DD"
                placeholderTextColor={COLORS.textLight}
                value={startDate}
                onChangeText={setStartDate}
              />
            </View>
          </View>

          <View style={[styles.fieldGroup, { flex: 1, marginLeft: 8 }]}>
            <Text style={styles.label}>Fecha Fin</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="calendar-outline" size={16} color={COLORS.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="AAAA-MM-DD"
                placeholderTextColor={COLORS.textLight}
                value={endDate}
                onChangeText={setEndDate}
              />
            </View>
          </View>
        </View>

        {/* Advance Amount */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Adelanto / Viáticos Recibidos (S/.) *</Text>
          <View style={[styles.inputWrapper, styles.moneyWrapper]}>
            <Text style={styles.currencyPrefix}>S/</Text>
            <TextInput
              style={[styles.input, styles.moneyInput]}
              placeholder="0.00"
              placeholderTextColor={COLORS.textLight}
              keyboardType="decimal-pad"
              value={advanceAmount}
              onChangeText={setAdvanceAmount}
            />
          </View>
          <Text style={styles.helperText}>
            Importe total entregado por la empresa para este viaje (en Soles).
          </Text>
        </View>

        {/* Action Button */}
        <View style={styles.actionContainer}>
          <Button
            title="Crear Rendición y Continuar"
            variant="primary"
            size="large"
            loading={loading}
            onPress={handleCreate}
          />
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
  introBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  introIcon: {
    marginRight: 12,
  },
  introTextBox: {
    flex: 1,
  },
  introTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.primary,
    marginBottom: 2,
  },
  introSub: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 16,
  },
  fieldGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    height: 48,
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  multilineInput: {
    height: 60,
    paddingTop: 10,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  moneyWrapper: {
    borderColor: COLORS.primaryLight,
    borderWidth: 1.5,
  },
  currencyPrefix: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.primary,
    marginRight: 6,
  },
  moneyInput: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary,
  },
  helperText: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 4,
    marginLeft: 2,
  },
  actionContainer: {
    marginTop: 14,
  },
});
