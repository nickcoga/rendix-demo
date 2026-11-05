import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert,
  Modal,
  SafeAreaView,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, CATEGORIES, DOCUMENT_TYPES } from '../../src/constants/theme';
import {
  type DocumentType,
  type ExpenseCategory,
  type ExtractedReceiptData,
  type FieldStatus,
} from '../../src/types';
import { createExpense } from '../../src/services/database/expenseService';
import { StatusBadge } from '../../src/components/StatusBadge';
import { Button } from '../../src/components/Button';
import { evaluateTaxReconciliation } from '../../src/utils/taxReconciliation';

export default function ExpenseFormScreen() {
  const { tripId, draftUri, aiData } = useLocalSearchParams<{
    tripId: string;
    draftUri: string;
    aiData?: string;
  }>();

  const parsedTripId = parseInt(tripId || '0', 10);
  const router = useRouter();
  const db = useSQLiteContext();

  // Parse extracted AI data if available
  const parsedAi: ExtractedReceiptData | null = aiData ? JSON.parse(aiData) : null;

  // Form Fields State
  const [docType, setDocType] = useState<DocumentType>(
    (parsedAi?.documentType as DocumentType) || 'FACTURA'
  );
  const [category, setCategory] = useState<ExpenseCategory>('Alimentación');
  const [vendorName, setVendorName] = useState(parsedAi?.vendorName || '');
  const [ruc, setRuc] = useState(parsedAi?.ruc || '');
  const [series, setSeries] = useState(parsedAi?.series || '');
  const [number, setNumber] = useState(parsedAi?.number || '');
  const [date, setDate] = useState(
    parsedAi?.date || new Date().toISOString().split('T')[0]
  );
  const [currency, setCurrency] = useState(parsedAi?.currency || 'PEN');
  const [taxableBase, setTaxableBase] = useState(
    parsedAi?.taxableBase != null ? parsedAi.taxableBase.toString() : ''
  );
  const [igv, setIgv] = useState(
    parsedAi?.igv != null ? parsedAi.igv.toString() : ''
  );
  const [rc, setRc] = useState(
    parsedAi?.rc != null ? parsedAi.rc.toString() : ''
  );
  const [totalAmount, setTotalAmount] = useState(
    parsedAi?.totalAmount != null ? parsedAi.totalAmount.toString() : ''
  );
  const [notes, setNotes] = useState(parsedAi?.notes || '');

  // Field Origin Tracking ('ai_detected' | 'not_detected' | 'manually_edited')
  const [fieldStatus, setFieldStatus] = useState<Record<string, FieldStatus>>({
    docType: parsedAi?.documentType ? 'ai_detected' : 'not_detected',
    vendorName: parsedAi?.vendorName ? 'ai_detected' : 'not_detected',
    ruc: parsedAi?.ruc ? 'ai_detected' : 'not_detected',
    series: parsedAi?.series ? 'ai_detected' : 'not_detected',
    number: parsedAi?.number ? 'ai_detected' : 'not_detected',
    date: parsedAi?.date ? 'ai_detected' : 'not_detected',
    currency: parsedAi?.currency ? 'ai_detected' : 'not_detected',
    taxableBase: parsedAi?.taxableBase != null ? 'ai_detected' : 'not_detected',
    igv: parsedAi?.igv != null ? 'ai_detected' : 'not_detected',
    rc: parsedAi?.rc != null ? 'ai_detected' : 'not_detected',
    totalAmount: parsedAi?.totalAmount != null ? 'ai_detected' : 'not_detected',
    notes: parsedAi?.notes ? 'ai_detected' : 'not_detected',
  });

  const [fullPhotoVisible, setFullPhotoVisible] = useState(false);
  const [saving, setSaving] = useState(false);

  // Helper to mark field as manually edited when user types
  const markEdited = (fieldName: string) => {
    setFieldStatus((prev) => ({
      ...prev,
      [fieldName]: 'manually_edited',
    }));
  };

  // Accounting tax reconciliation (pure utility)
  const recon = evaluateTaxReconciliation({
    docType,
    taxableBase,
    igv,
    rc,
    totalAmount,
  });

  const {
    numericBase,
    numericIgv,
    numericRc,
    hasRcDeclared,
    numericTotal,
    calculatedSum,
    hasTaxDiscrepancy,
    isRcUnspecifiedDifference,
    unspecifiedDiffAmount,
  } = recon;

  const isRucInvalidLength = ruc.trim().length > 0 && ruc.trim().length !== 11;

  const handleSave = async () => {
    if (!draftUri) {
      Alert.alert('Error', 'Falta la fotografía del comprobante.');
      return;
    }

    if (!numericTotal || numericTotal <= 0) {
      Alert.alert('Campo Requerido', 'Por favor ingresa un importe total válido mayor a 0.');
      return;
    }

    setSaving(true);
    try {
      await createExpense(db, {
        trip_id: parsedTripId,
        category: category,
        document_type: docType,
        date: date.trim(),
        vendor_name: vendorName.trim() || null,
        ruc: ruc.trim() || null,
        series: series.trim() || null,
        number: number.trim() || null,
        currency: currency,
        taxable_base: numericBase > 0 ? numericBase : null,
        igv: numericIgv > 0 ? numericIgv : null,
        rc: hasRcDeclared && numericRc !== null ? numericRc : null,
        total_amount: numericTotal,
        draft_photo_uri: draftUri,
        notes: notes.trim() || null,
      });

      // Navigate back to the trip
      router.dismissAll();
      router.replace(`/trip/${parsedTripId}`);
    } catch (err: any) {
      Alert.alert('Error al guardar', err?.message || 'No se pudo registrar el comprobante');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Photo Thumbnail Strip */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setFullPhotoVisible(true)}
          style={styles.photoBanner}
        >
          {draftUri ? (
            <Image source={{ uri: draftUri }} style={styles.bannerThumb} />
          ) : (
            <View style={[styles.bannerThumb, styles.bannerPlaceholder]}>
              <Ionicons name="image-outline" size={24} color={COLORS.textMuted} />
            </View>
          )}
          <View style={styles.bannerInfo}>
            <Text style={styles.bannerTitle}>Comprobante Capturado</Text>
            <Text style={styles.bannerSub}>Toca para ampliar y verificar detalles</Text>
          </View>
          <Ionicons name="expand-outline" size={20} color={COLORS.primary} />
        </TouchableOpacity>

        {/* AI Info Banner */}
        {parsedAi ? (
          <View style={styles.aiAlertBox}>
            <Ionicons name="sparkles" size={18} color="#92400E" style={{ marginRight: 8 }} />
            <Text style={styles.aiAlertText}>
              Gemini extrajo estos datos preliminares. Revisa y corrige cualquier campo antes de guardar.
            </Text>
          </View>
        ) : (
          <View style={styles.manualAlertBox}>
            <Ionicons name="create-outline" size={18} color={COLORS.primary} style={{ marginRight: 8 }} />
            <Text style={styles.manualAlertText}>
              Modo Manual: Completa los datos visibles del comprobante.
            </Text>
          </View>
        )}

        {/* Tax discrepancy warning (when declared values conflict) */}
        {hasTaxDiscrepancy && (
          <View style={styles.warningBox}>
            <Ionicons name="alert-circle-outline" size={18} color="#B45309" style={{ marginRight: 8 }} />
            <Text style={styles.warningText}>
              Aviso: La suma (Base S/ {numericBase.toFixed(2)} + IGV S/ {numericIgv.toFixed(2)}{hasRcDeclared && numericRc !== null ? ` + RC S/ ${numericRc.toFixed(2)}` : ''} = S/ {calculatedSum.toFixed(2)}) difiere del total (S/ {numericTotal.toFixed(2)}). Puedes revisarlo o guardarlo de todas formas.
            </Text>
          </View>
        )}

        {/* Informational notice when RC is unspecified */}
        {isRcUnspecifiedDifference && (
          <View style={[styles.warningBox, { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }]}>
            <Ionicons name="information-circle-outline" size={18} color="#1D4ED8" style={{ marginRight: 8 }} />
            <Text style={[styles.warningText, { color: '#1E40AF' }]}>
              {unspecifiedDiffAmount > 0.15
                ? `Nota: Existe una diferencia de S/ ${unspecifiedDiffAmount.toFixed(2)} entre Base + IGV y el Total. Si el comprobante incluye Recargo al Consumo (RC), puedes registrarlo en el campo RC.`
                : 'Nota: Base e IGV coinciden con el Total. Si confirmas que este comprobante no incluye Recargo al Consumo, ingresa 0 en el campo RC para completar la conciliación.'}
            </Text>
          </View>
        )}

        {/* RUC length advisory (non-blocking) */}
        {isRucInvalidLength && (
          <View style={styles.warningBox}>
            <Ionicons name="information-circle-outline" size={18} color="#B45309" style={{ marginRight: 8 }} />
            <Text style={styles.warningText}>
              Aviso: El RUC en Perú consta de 11 dígitos numéricos (comenzando en 10 o 20).
            </Text>
          </View>
        )}

        {/* --- Form Fields --- */}

        {/* Document Type Selector */}
        <View style={styles.fieldCard}>
          <Text style={styles.fieldLabel}>Tipo de Comprobante</Text>
          <StatusBadge status={fieldStatus.docType} />
          <View style={styles.chipRow}>
            {DOCUMENT_TYPES.map((type) => (
              <TouchableOpacity
                key={type}
                activeOpacity={0.7}
                onPress={() => {
                  setDocType(type);
                  markEdited('docType');
                }}
                style={[
                  styles.chip,
                  docType === type && styles.chipActive,
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    docType === type && styles.chipTextActive,
                  ]}
                >
                  {type}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Category Selector */}
        <View style={styles.fieldCard}>
          <Text style={styles.fieldLabel}>Categoría de Gasto *</Text>
          <View style={styles.chipRow}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat}
                activeOpacity={0.7}
                onPress={() => setCategory(cat)}
                style={[
                  styles.chip,
                  category === cat && styles.chipActive,
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    category === cat && styles.chipTextActive,
                  ]}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Vendor Name */}
        <View style={styles.fieldCard}>
          <Text style={styles.fieldLabel}>Proveedor / Razón Social</Text>
          <StatusBadge status={fieldStatus.vendorName} />
          <TextInput
            style={styles.textInput}
            placeholder="Ej: Grifo Primax / Hotel Los Portales / Taxis S.A."
            placeholderTextColor={COLORS.textLight}
            value={vendorName}
            onChangeText={(val) => {
              setVendorName(val);
              markEdited('vendorName');
            }}
          />
        </View>

        {/* RUC */}
        <View style={styles.fieldCard}>
          <Text style={styles.fieldLabel}>RUC del Emisor (Opcional en tickets)</Text>
          <StatusBadge status={fieldStatus.ruc} />
          <TextInput
            style={styles.textInput}
            placeholder="Ej: 20100070970 (11 dígitos)"
            placeholderTextColor={COLORS.textLight}
            keyboardType="number-pad"
            maxLength={11}
            value={ruc}
            onChangeText={(val) => {
              setRuc(val);
              markEdited('ruc');
            }}
          />
        </View>

        {/* Series & Number */}
        <View style={styles.twoColRow}>
          <View style={[styles.fieldCard, { flex: 1, marginRight: 6 }]}>
            <Text style={styles.fieldLabel}>Serie</Text>
            <StatusBadge status={fieldStatus.series} />
            <TextInput
              style={styles.textInput}
              placeholder="Ej: F001 / B001"
              placeholderTextColor={COLORS.textLight}
              autoCapitalize="characters"
              value={series}
              onChangeText={(val) => {
                setSeries(val);
                markEdited('series');
              }}
            />
          </View>

          <View style={[styles.fieldCard, { flex: 1, marginLeft: 6 }]}>
            <Text style={styles.fieldLabel}>Número</Text>
            <StatusBadge status={fieldStatus.number} />
            <TextInput
              style={styles.textInput}
              placeholder="Ej: 00012345"
              placeholderTextColor={COLORS.textLight}
              value={number}
              onChangeText={(val) => {
                setNumber(val);
                markEdited('number');
              }}
            />
          </View>
        </View>

        {/* Date & Currency */}
        <View style={styles.twoColRow}>
          <View style={[styles.fieldCard, { flex: 1.5, marginRight: 6 }]}>
            <Text style={styles.fieldLabel}>Fecha de Emisión</Text>
            <StatusBadge status={fieldStatus.date} />
            <TextInput
              style={styles.textInput}
              placeholder="AAAA-MM-DD"
              placeholderTextColor={COLORS.textLight}
              value={date}
              onChangeText={(val) => {
                setDate(val);
                markEdited('date');
              }}
            />
          </View>

          <View style={[styles.fieldCard, { flex: 1, marginLeft: 6 }]}>
            <Text style={styles.fieldLabel}>Moneda</Text>
            <StatusBadge status={fieldStatus.currency} />
            <View style={styles.currencyToggleRow}>
              <TouchableOpacity
                onPress={() => {
                  setCurrency('PEN');
                  markEdited('currency');
                }}
                style={[
                  styles.currencyToggleBtn,
                  currency === 'PEN' && styles.currencyToggleBtnActive,
                ]}
              >
                <Text style={[styles.currencyToggleText, currency === 'PEN' && styles.currencyToggleTextActive]}>
                  PEN (S/)
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setCurrency('USD');
                  markEdited('currency');
                }}
                style={[
                  styles.currencyToggleBtn,
                  currency === 'USD' && styles.currencyToggleBtnActive,
                ]}
              >
                <Text style={[styles.currencyToggleText, currency === 'USD' && styles.currencyToggleTextActive]}>
                  USD ($)
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Tax breakdown (Base and IGV) */}
        <View style={styles.twoColRow}>
          <View style={[styles.fieldCard, { flex: 1, marginRight: 6 }]}>
            <Text style={styles.fieldLabel}>Base Imp. (Opcional)</Text>
            <StatusBadge status={fieldStatus.taxableBase} />
            <TextInput
              style={styles.textInput}
              placeholder="0.00"
              placeholderTextColor={COLORS.textLight}
              keyboardType="decimal-pad"
              value={taxableBase}
              onChangeText={(val) => {
                setTaxableBase(val);
                markEdited('taxableBase');
              }}
            />
          </View>

          <View style={[styles.fieldCard, { flex: 1, marginLeft: 6 }]}>
            <Text style={styles.fieldLabel}>IGV (Opcional)</Text>
            <StatusBadge status={fieldStatus.igv} />
            <TextInput
              style={styles.textInput}
              placeholder="0.00"
              placeholderTextColor={COLORS.textLight}
              keyboardType="decimal-pad"
              value={igv}
              onChangeText={(val) => {
                setIgv(val);
                markEdited('igv');
              }}
            />
          </View>
        </View>

        {/* Recargo al Consumo (RC) - Optional for restaurants/services */}
        <View style={styles.fieldCard}>
          <Text style={styles.fieldLabel}>Recargo al Consumo / RC (Opcional)</Text>
          <StatusBadge status={fieldStatus.rc} />
          <TextInput
            style={styles.textInput}
            placeholder="0.00"
            placeholderTextColor={COLORS.textLight}
            keyboardType="decimal-pad"
            value={rc}
            onChangeText={(val) => {
              setRc(val);
              markEdited('rc');
            }}
          />
        </View>

        {/* Total Amount (Crucial / Required) */}
        <View style={[styles.fieldCard, styles.totalCard]}>
          <Text style={styles.totalLabel}>Importe Total Pagado *</Text>
          <StatusBadge status={fieldStatus.totalAmount} />
          <View style={styles.totalInputRow}>
            <Text style={styles.totalPrefix}>{currency === 'USD' ? '$' : 'S/'}</Text>
            <TextInput
              style={styles.totalInput}
              placeholder="0.00"
              placeholderTextColor="#94A3B8"
              keyboardType="decimal-pad"
              value={totalAmount}
              onChangeText={(val) => {
                setTotalAmount(val);
                markEdited('totalAmount');
              }}
            />
          </View>
        </View>

        {/* Notes / Concept */}
        <View style={styles.fieldCard}>
          <Text style={styles.fieldLabel}>Observaciones / Concepto</Text>
          <StatusBadge status={fieldStatus.notes} />
          <TextInput
            style={[styles.textInput, styles.notesInput]}
            placeholder="Ej: Almuerzo equipo de trabajo, Peaje Chilca retorno"
            placeholderTextColor={COLORS.textLight}
            multiline
            numberOfLines={2}
            value={notes}
            onChangeText={(val) => {
              setNotes(val);
              markEdited('notes');
            }}
          />
        </View>

        {/* Save CTA Button */}
        <View style={styles.saveContainer}>
          <Button
            title="Confirmar y Guardar Comprobante"
            variant="primary"
            size="large"
            loading={saving}
            icon={<Ionicons name="checkmark-circle-outline" size={22} color={COLORS.accent} />}
            onPress={handleSave}
          />
        </View>
      </ScrollView>

      {/* Full Photo Modal */}
      <Modal visible={fullPhotoVisible} transparent animationType="fade">
        <SafeAreaView style={styles.modalBackdrop}>
          <TouchableOpacity
            style={styles.modalCloseBtn}
            onPress={() => setFullPhotoVisible(false)}
          >
            <Ionicons name="close" size={28} color="#FFFFFF" />
          </TouchableOpacity>
          {draftUri && (
            <Image source={{ uri: draftUri }} style={styles.modalImage} resizeMode="contain" />
          )}
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  photoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    marginBottom: 12,
  },
  bannerThumb: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 12,
  },
  bannerPlaceholder: {
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerInfo: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  bannerSub: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  aiAlertBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FDE68A',
    marginBottom: 12,
  },
  aiAlertText: {
    fontSize: 12,
    color: '#92400E',
    flex: 1,
    lineHeight: 16,
  },
  manualAlertBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    marginBottom: 12,
  },
  manualAlertText: {
    fontSize: 12,
    color: '#0369A1',
    flex: 1,
    lineHeight: 16,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FDE68A',
    marginBottom: 12,
  },
  warningText: {
    fontSize: 12,
    color: '#B45309',
    flex: 1,
    lineHeight: 16,
  },
  fieldCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    height: 44,
    fontSize: 14,
    color: COLORS.textPrimary,
    marginTop: 4,
  },
  notesInput: {
    height: 60,
    paddingTop: 8,
    textAlignVertical: 'top',
  },
  twoColRow: {
    flexDirection: 'row',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  chipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  chipTextActive: {
    color: COLORS.textWhite,
  },
  currencyToggleRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
  },
  currencyToggleBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  currencyToggleBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  currencyToggleText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  currencyToggleTextActive: {
    color: COLORS.textWhite,
  },
  totalCard: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
    borderWidth: 1.5,
  },
  totalLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#166534',
  },
  totalInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  totalPrefix: {
    fontSize: 22,
    fontWeight: '900',
    color: '#166534',
    marginRight: 6,
  },
  totalInput: {
    flex: 1,
    fontSize: 22,
    fontWeight: '900',
    color: '#166534',
    height: 48,
  },
  saveContainer: {
    marginTop: 10,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseBtn: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 10,
    padding: 10,
  },
  modalImage: {
    width: '95%',
    height: '80%',
  },
});
