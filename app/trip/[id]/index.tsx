import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Alert,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  BackHandler,
} from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect, Stack } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../../src/constants/theme';
import { type Trip, type Expense, type TripFinancialSummary } from '../../../src/types';
import { getTripById, getTripSummary, deleteTrip } from '../../../src/services/database/tripService';
import { getExpensesByTripId } from '../../../src/services/database/expenseService';
import { FinancialCard } from '../../../src/components/FinancialCard';
import { ExpenseItemCard } from '../../../src/components/ExpenseItemCard';
import { Button } from '../../../src/components/Button';
import { exportTripToPdf } from '../../../src/services/export/pdfExport';
import { exportTripToExcel } from '../../../src/services/export/excelExport';

export default function TripDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const tripId = parseInt(id || '0', 10);
  const router = useRouter();
  const db = useSQLiteContext();

  const [trip, setTrip] = useState<Trip | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [summary, setSummary] = useState<TripFinancialSummary>({
    advanceAmount: 0,
    totalSpent: 0,
    balance: 0,
    receiptCount: 0,
    currency: 'PEN',
  });
  const [loading, setLoading] = useState(true);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    if (!tripId) return;
    try {
      const tripData = await getTripById(db, tripId);
      if (!tripData) {
        Alert.alert('Error', 'Rendición no encontrada');
        router.back();
        return;
      }
      setTrip(tripData);

      const expensesData = await getExpensesByTripId(db, tripId);
      setExpenses(expensesData);

      const summaryData = await getTripSummary(db, tripId);
      setSummary(summaryData);
    } catch (err) {
      console.error('Error al cargar datos del viaje:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [db, tripId]);

  const handleGoBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  }, [router]);

  useFocusEffect(
    useCallback(() => {
      loadData();

      const onBackPress = () => {
        handleGoBack();
        return true;
      };

      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => subscription.remove();
    }, [loadData, handleGoBack])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleExportPdf = async () => {
    if (!trip) return;
    setExportingPdf(true);
    try {
      await exportTripToPdf(trip, expenses, summary);
    } catch (err: any) {
      Alert.alert('Error al generar PDF', err?.message || 'No se pudo crear el archivo PDF');
    } finally {
      setExportingPdf(false);
    }
  };

  const handleExportExcel = async () => {
    if (!trip) return;
    setExportingExcel(true);
    try {
      await exportTripToExcel(trip, expenses, summary);
    } catch (err: any) {
      Alert.alert('Error al generar Excel', err?.message || 'No se pudo crear el archivo Excel');
    } finally {
      setExportingExcel(false);
    }
  };

  const handleDeleteTrip = () => {
    Alert.alert(
      'Eliminar Rendición',
      '¿Estás seguro de eliminar esta rendición completa? Se eliminarán todos sus comprobantes y fotografías físicas asociadas.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteTrip(db, tripId);
              router.replace('/');
            } catch (err: any) {
              Alert.alert('Error', 'No se pudo eliminar el viaje: ' + err.message);
            }
          },
        },
      ]
    );
  };

  if (loading || !trip) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: trip.destination,
          headerLeft: () => (
            <TouchableOpacity
              onPress={handleGoBack}
              activeOpacity={0.7}
              style={{ paddingRight: 16, paddingVertical: 6 }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="arrow-back" size={24} color={COLORS.textWhite} />
            </TouchableOpacity>
          ),
          headerRight: () => (
            <TouchableOpacity onPress={handleDeleteTrip} style={{ padding: 6 }}>
              <Ionicons name="trash-outline" size={20} color="#FCA5A5" />
            </TouchableOpacity>
          ),
        }}
      />

      <View style={styles.container}>
        <FlatList
          data={expenses}
          keyExtractor={(item) => item.id.toString()}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[COLORS.primary]}
            />
          }
          ListHeaderComponent={
            <View>
              {/* Trip Info Header */}
              <View style={styles.tripMetaCard}>
                <View style={styles.metaRow}>
                  <Ionicons name="person" size={15} color={COLORS.primary} style={{ marginRight: 6 }} />
                  <Text style={styles.metaTech}>{trip.technician_name}</Text>
                  <View style={styles.badgeTripOpen}>
                    <Text style={styles.badgeTripOpenText}>
                      {trip.status === 'OPEN' ? 'En Curso' : 'Cerrada'}
                    </Text>
                  </View>
                </View>

                <Text style={styles.metaReason}>{trip.reason}</Text>

                <View style={styles.metaDatesRow}>
                  <Ionicons name="calendar-outline" size={13} color={COLORS.textMuted} style={{ marginRight: 4 }} />
                  <Text style={styles.metaDatesText}>
                    {trip.start_date} al {trip.end_date}
                  </Text>
                </View>
              </View>

              {/* Financial Balance Card */}
              <FinancialCard summary={summary} />

              {/* Action Buttons: Add Receipt & Exports */}
              <View style={styles.actionsBox}>
                <Button
                  title="Agregar Comprobante"
                  variant="primary"
                  icon={<Ionicons name="camera" size={20} color={COLORS.accent} />}
                  onPress={() => router.push(`/expense/capture?tripId=${tripId}`)}
                  style={{ marginBottom: 10 }}
                />

                <View style={styles.exportRow}>
                  <Button
                    title="Exportar PDF"
                    variant="outline"
                    size="small"
                    loading={exportingPdf}
                    icon={<Ionicons name="document-text-outline" size={17} color={COLORS.primary} />}
                    onPress={handleExportPdf}
                    style={{ flex: 1, marginRight: 6 }}
                  />

                  <Button
                    title="Exportar Excel"
                    variant="outline"
                    size="small"
                    loading={exportingExcel}
                    icon={<Ionicons name="grid-outline" size={17} color={COLORS.primary} />}
                    onPress={handleExportExcel}
                    style={{ flex: 1, marginLeft: 6 }}
                  />
                </View>
              </View>

              {/* Section Header */}
              <View style={styles.listHeaderRow}>
                <Text style={styles.listHeaderTitle}>
                  Comprobantes Registrados ({expenses.length})
                </Text>
              </View>
            </View>
          }
          renderItem={({ item }) => (
            <ExpenseItemCard
              expense={item}
              onPress={() => router.push(`/expense/${item.id}`)}
            />
          )}
          ListEmptyComponent={
            <View style={styles.emptyExpensesBox}>
              <Ionicons name="receipt-outline" size={38} color={COLORS.textLight} />
              <Text style={styles.emptyExpensesTitle}>Aún no hay comprobantes</Text>
              <Text style={styles.emptyExpensesSub}>
                Toma una foto de tu factura, boleta o ticket para que Gemini extraiga los datos automáticamente.
              </Text>
            </View>
          }
          contentContainerStyle={styles.listContent}
        />
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
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  tripMetaCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  metaTech: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.primary,
    flex: 1,
  },
  badgeTripOpen: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeTripOpenText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563EB',
  },
  metaReason: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 8,
    lineHeight: 18,
  },
  metaDatesRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaDatesText: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  actionsBox: {
    marginVertical: 8,
  },
  exportRow: {
    flexDirection: 'row',
  },
  listHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    marginBottom: 10,
  },
  listHeaderTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  emptyExpensesBox: {
    alignItems: 'center',
    paddingVertical: 36,
    paddingHorizontal: 20,
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderStyle: 'dashed',
    marginTop: 8,
  },
  emptyExpensesTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: 10,
    marginBottom: 4,
  },
  emptyExpensesSub: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 17,
  },
});
