import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';
import { type Trip } from '../types';

interface TripCardProps {
  trip: Trip;
  totalSpent?: number;
  receiptCount?: number;
  onPress: () => void;
}

export function TripCard({ trip, totalSpent = 0, receiptCount = 0, onPress }: TripCardProps) {
  const balance = trip.advance_amount - totalSpent;
  const isPositive = balance >= 0;

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={onPress}
      style={styles.card}
    >
      <View style={styles.headerRow}>
        <View style={styles.destinationBox}>
          <Ionicons name="location-sharp" size={18} color={COLORS.primary} style={styles.icon} />
          <Text style={styles.destinationText} numberOfLines={1}>
            {trip.destination}
          </Text>
        </View>
        <View style={[styles.statusPill, trip.status === 'OPEN' ? styles.statusOpen : styles.statusClosed]}>
          <Text style={[styles.statusText, trip.status === 'OPEN' ? styles.statusOpenText : styles.statusClosedText]}>
            {trip.status === 'OPEN' ? 'En Curso' : 'Cerrada'}
          </Text>
        </View>
      </View>

      <Text style={styles.reasonText} numberOfLines={2}>
        {trip.reason}
      </Text>

      <View style={styles.infoRow}>
        <View style={styles.infoItem}>
          <Ionicons name="person-outline" size={13} color={COLORS.textMuted} />
          <Text style={styles.infoText} numberOfLines={1}>{trip.technician_name}</Text>
        </View>

        <View style={styles.infoItem}>
          <Ionicons name="calendar-outline" size={13} color={COLORS.textMuted} />
          <Text style={styles.infoText}>{trip.start_date} al {trip.end_date}</Text>
        </View>
      </View>

      <View style={styles.footerRow}>
        <View>
          <Text style={styles.footerLabel}>Adelanto: S/ {trip.advance_amount.toFixed(2)}</Text>
          <Text style={styles.footerSpent}>Gastado: S/ {totalSpent.toFixed(2)} ({receiptCount} docs)</Text>
        </View>

        <View style={[styles.balancePill, isPositive ? styles.balancePillPos : styles.balancePillNeg]}>
          <Text style={[styles.balancePillText, isPositive ? styles.balanceTextPos : styles.balanceTextNeg]}>
            {isPositive ? 'Saldo: +' : 'Excedente: -'}S/ {Math.abs(balance).toFixed(2)}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  destinationBox: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  icon: {
    marginRight: 6,
  },
  destinationText: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.primary,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusOpen: {
    backgroundColor: '#EFF6FF',
  },
  statusClosed: {
    backgroundColor: '#F1F5F9',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  statusOpenText: {
    color: '#2563EB',
  },
  statusClosedText: {
    color: '#64748B',
  },
  reasonText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 10,
    lineHeight: 18,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderColor: '#F1F5F9',
    marginBottom: 8,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  infoText: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 8,
  },
  footerLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  footerSpent: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  balancePill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  balancePillPos: {
    backgroundColor: COLORS.successLight,
  },
  balancePillNeg: {
    backgroundColor: COLORS.dangerLight,
  },
  balancePillText: {
    fontSize: 12,
    fontWeight: '800',
  },
  balanceTextPos: {
    color: COLORS.success,
  },
  balanceTextNeg: {
    color: COLORS.danger,
  },
});
