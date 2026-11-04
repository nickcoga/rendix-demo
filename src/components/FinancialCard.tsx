import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';
import { type TripFinancialSummary } from '../types';

interface FinancialCardProps {
  summary: TripFinancialSummary;
}

export function FinancialCard({ summary }: FinancialCardProps) {
  const isPositive = summary.balance >= 0;
  const balanceLabel = isPositive ? 'Saldo a Devolver' : 'Excedente a Reembolsar';
  const balanceColor = isPositive ? COLORS.success : COLORS.danger;
  const balanceBg = isPositive ? COLORS.successLight : COLORS.dangerLight;

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Adelanto / Viáticos</Text>
          <Text style={styles.statValue}>S/ {summary.advanceAmount.toFixed(2)}</Text>
        </View>

        <View style={styles.dividerVertical} />

        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Total Gastado ({summary.receiptCount})</Text>
          <Text style={[styles.statValue, { color: COLORS.primaryLight }]}>
            S/ {summary.totalSpent.toFixed(2)}
          </Text>
        </View>
      </View>

      <View style={[styles.balanceRow, { backgroundColor: balanceBg }]}>
        <View style={styles.balanceInfo}>
          <Ionicons
            name={isPositive ? 'wallet-outline' : 'alert-circle-outline'}
            size={20}
            color={balanceColor}
            style={styles.balanceIcon}
          />
          <Text style={[styles.balanceLabel, { color: balanceColor }]}>{balanceLabel}</Text>
        </View>
        <Text style={[styles.balanceAmount, { color: balanceColor }]}>
          S/ {Math.abs(summary.balance).toFixed(2)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    marginVertical: 10,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 12,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  dividerVertical: {
    width: 1,
    backgroundColor: COLORS.cardBorder,
    marginHorizontal: 8,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '500',
    marginBottom: 4,
    textAlign: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 4,
  },
  balanceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  balanceIcon: {
    marginRight: 6,
  },
  balanceLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  balanceAmount: {
    fontSize: 17,
    fontWeight: '900',
  },
});
