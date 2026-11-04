import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../src/constants/theme';
import { type Trip } from '../src/types';
import { getAllTrips } from '../src/services/database/tripService';
import { TripCard } from '../src/components/TripCard';
import { Button } from '../src/components/Button';

interface TripWithStats extends Trip {
  totalSpent: number;
  receiptCount: number;
}

export default function HomeScreen() {
  const router = useRouter();
  const db = useSQLiteContext();
  const [trips, setTrips] = useState<TripWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadTrips = useCallback(async () => {
    try {
      const allTrips = await getAllTrips(db);
      const tripsWithStats: TripWithStats[] = [];

      for (const t of allTrips) {
        const stats = await db.getFirstAsync<{ total_spent: number | null; receipt_count: number }>(
          'SELECT SUM(total_amount) AS total_spent, COUNT(*) AS receipt_count FROM expenses WHERE trip_id = ?',
          [t.id]
        );
        tripsWithStats.push({
          ...t,
          totalSpent: stats?.total_spent || 0,
          receiptCount: stats?.receipt_count || 0,
        });
      }

      setTrips(tripsWithStats);
    } catch (err) {
      console.error('Error al cargar rendiciones:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      loadTrips();
    }, [loadTrips])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadTrips();
  };

  // Header summary totals
  const totalDisbursed = trips.reduce((acc, t) => acc + t.advance_amount, 0);
  const totalSpentAll = trips.reduce((acc, t) => acc + t.totalSpent, 0);

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Brand Header */}
      <View style={styles.header}>
        <View style={styles.brandRow}>
          <View>
            <View style={styles.logoRow}>
              <Text style={styles.logoText}>RENDIX</Text>
              <View style={styles.logoDot} />
            </View>
            <Text style={styles.tagline}>Gestión de Viáticos y Rendiciones</Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.push('/settings')}
            style={styles.settingsBtn}
          >
            <Ionicons name="settings-outline" size={22} color={COLORS.textWhite} />
          </TouchableOpacity>
        </View>

        {/* Global Stats Overview */}
        {trips.length > 0 && (
          <View style={styles.statsCard}>
            <View style={styles.statColumn}>
              <Text style={styles.statSub}>Total Adelantos</Text>
              <Text style={styles.statNum}>S/ {totalDisbursed.toFixed(2)}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statColumn}>
              <Text style={styles.statSub}>Total Sustentado</Text>
              <Text style={[styles.statNum, { color: COLORS.accent }]}>
                S/ {totalSpentAll.toFixed(2)}
              </Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statColumn}>
              <Text style={styles.statSub}>Viajes</Text>
              <Text style={styles.statNum}>{trips.length}</Text>
            </View>
          </View>
        )}
      </View>

      {/* Main Content */}
      <View style={styles.body}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Historial de Rendiciones</Text>
          <Text style={styles.sectionCount}>
            {trips.length} {trips.length === 1 ? 'viaje' : 'viajes'}
          </Text>
        </View>

        <FlatList
          data={trips}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <TripCard
              trip={item}
              totalSpent={item.totalSpent}
              receiptCount={item.receiptCount}
              onPress={() => router.push(`/trip/${item.id}`)}
            />
          )}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[COLORS.primary]}
              tintColor={COLORS.primary}
            />
          }
          ListEmptyComponent={
            !loading ? (
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIconBox}>
                  <Ionicons name="briefcase-outline" size={44} color={COLORS.primaryLight} />
                </View>
                <Text style={styles.emptyTitle}>No hay rendiciones registradas</Text>
                <Text style={styles.emptyText}>
                  Crea tu primera rendición para registrar los datos del técnico, el viaje y los viáticos recibidos.
                </Text>
              </View>
            ) : undefined
          }
        />

        {/* Floating / Bottom CTA Button */}
        <View style={styles.bottomBar}>
          <Button
            title="Nueva Rendición de Gastos"
            variant="primary"
            size="large"
            icon={<Ionicons name="add-circle-outline" size={22} color={COLORS.accent} />}
            onPress={() => router.push('/trip/new')}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.primary,
  },
  header: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
  },
  brandRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  logoText: {
    fontSize: 28,
    fontWeight: '900',
    color: COLORS.textWhite,
    letterSpacing: -0.5,
  },
  logoDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.accent,
    marginLeft: 3,
  },
  tagline: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
    fontWeight: '500',
  },
  settingsBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsCard: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  statColumn: {
    alignItems: 'center',
    flex: 1,
  },
  statSub: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '600',
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  statNum: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textWhite,
  },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginVertical: 4,
  },
  body: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  sectionCount: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  listContent: {
    paddingBottom: 90,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
    paddingHorizontal: 20,
  },
  emptyIconBox: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 19,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderColor: COLORS.cardBorder,
  },
});
