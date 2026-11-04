import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert,
  Modal,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../src/constants/theme';
import { type Expense } from '../../src/types';
import { getExpenseById, deleteExpense } from '../../src/services/database/expenseService';
import { Button } from '../../src/components/Button';

export default function ExpenseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const expenseId = parseInt(id || '0', 10);
  const router = useRouter();
  const db = useSQLiteContext();

  const [expense, setExpense] = useState<Expense | null>(null);
  const [loading, setLoading] = useState(true);
  const [fullPhotoVisible, setFullPhotoVisible] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    async function load() {
      if (!expenseId) return;
      try {
        const item = await getExpenseById(db, expenseId);
        setExpense(item);
      } catch (err) {
        console.error('Error al cargar comprobante:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [db, expenseId]);

  const handleDelete = () => {
    Alert.alert(
      'Eliminar Comprobante',
      '¿Estás seguro de eliminar este comprobante? La fotografía y el registro contable se borrarán de forma permanente.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await deleteExpense(db, expenseId);
              router.back();
            } catch (err: any) {
              Alert.alert('Error', 'No se pudo eliminar el comprobante: ' + err.message);
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  if (loading || !expense) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const docNumber = expense.series && expense.number
    ? `${expense.series}-${expense.number}`
    : (expense.series || expense.number || 'S/N');

  return (
    <>
      <Stack.Screen
        options={{
          title: `${expense.document_type} ${docNumber}`,
          headerRight: () => (
            <TouchableOpacity onPress={handleDelete} style={{ padding: 6 }}>
              <Ionicons name="trash-outline" size={20} color="#FCA5A5" />
            </TouchableOpacity>
          ),
        }}
      />

      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Photo Preview Card */}
          {expense.photo_uri ? (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => setFullPhotoVisible(true)}
              style={styles.imageCard}
            >
              <Image source={{ uri: expense.photo_uri }} style={styles.photo} />
              <View style={styles.imageOverlayTag}>
                <Ionicons name="expand-outline" size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
                <Text style={styles.imageOverlayText}>Ver tamaño completo</Text>
              </View>
            </TouchableOpacity>
          ) : null}

          {/* Amount Highlight Card */}
          <View style={styles.amountCard}>
            <Text style={styles.amountLabel}>Importe Total Pagado</Text>
            <Text style={styles.amountValue}>
              {expense.currency === 'USD' ? '$' : 'S/'} {expense.total_amount.toFixed(2)}
            </Text>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{expense.category}</Text>
            </View>
          </View>

          {/* Details Table */}
          <View style={styles.detailsCard}>
            <Text style={styles.cardHeader}>Datos del Comprobante</Text>

            <View style={styles.row}>
              <Text style={styles.rowLabel}>Tipo de Documento</Text>
              <Text style={styles.rowValueBold}>{expense.document_type}</Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.rowLabel}>Serie y Número</Text>
              <Text style={[styles.rowValue, styles.monoText]}>{docNumber}</Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.rowLabel}>Proveedor / Razón Social</Text>
              <Text style={styles.rowValue}>{expense.vendor_name || 'No especificado'}</Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.rowLabel}>RUC</Text>
              <Text style={[styles.rowValue, styles.monoText]}>{expense.ruc || 'No registrado'}</Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.rowLabel}>Fecha de Emisión</Text>
              <Text style={styles.rowValue}>{expense.date}</Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.rowLabel}>Moneda</Text>
              <Text style={styles.rowValue}>{expense.currency}</Text>
            </View>

            {expense.taxable_base != null && (
              <View style={styles.row}>
                <Text style={styles.rowLabel}>Base Imponible</Text>
                <Text style={styles.rowValue}>S/ {expense.taxable_base.toFixed(2)}</Text>
              </View>
            )}

            {expense.igv != null && (
              <View style={styles.row}>
                <Text style={styles.rowLabel}>IGV</Text>
                <Text style={styles.rowValue}>S/ {expense.igv.toFixed(2)}</Text>
              </View>
            )}

            {expense.notes ? (
              <View style={[styles.row, { borderBottomWidth: 0, flexDirection: 'column', alignItems: 'flex-start' }]}>
                <Text style={[styles.rowLabel, { marginBottom: 4 }]}>Observaciones / Concepto</Text>
                <Text style={styles.notesText}>{expense.notes}</Text>
              </View>
            ) : null}
          </View>

          {/* Delete Button */}
          <Button
            title="Eliminar Comprobante"
            variant="danger"
            size="normal"
            loading={deleting}
            icon={<Ionicons name="trash-outline" size={18} color="#FFFFFF" />}
            onPress={handleDelete}
            style={{ marginTop: 14 }}
          />
        </ScrollView>

        {/* Full Image Modal */}
        <Modal visible={fullPhotoVisible} transparent animationType="fade">
          <SafeAreaView style={styles.modalBackdrop}>
            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => setFullPhotoVisible(false)}
            >
              <Ionicons name="close" size={28} color="#FFFFFF" />
            </TouchableOpacity>
            {expense.photo_uri && (
              <Image source={{ uri: expense.photo_uri }} style={styles.modalImage} resizeMode="contain" />
            )}
          </SafeAreaView>
        </Modal>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  imageCard: {
    width: '100%',
    height: 240,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#000',
    marginBottom: 14,
    position: 'relative',
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  photo: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  imageOverlayTag: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.65)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  imageOverlayText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  amountCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    marginBottom: 14,
  },
  amountLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  amountValue: {
    fontSize: 32,
    fontWeight: '900',
    color: COLORS.primary,
    marginBottom: 8,
  },
  categoryBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  detailsCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  cardHeader: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderColor: '#F1F5F9',
    paddingBottom: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: '#F8FAFC',
  },
  rowLabel: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  rowValue: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
    textAlign: 'right',
    flex: 1,
    marginLeft: 10,
  },
  rowValueBold: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.primary,
  },
  monoText: {
    fontFamily: 'monospace',
  },
  notesText: {
    fontSize: 13,
    color: COLORS.textPrimary,
    lineHeight: 18,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
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
