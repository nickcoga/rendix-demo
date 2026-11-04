import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';
import { type Expense } from '../types';

interface ExpenseItemCardProps {
  expense: Expense;
  onPress: () => void;
}

export function ExpenseItemCard({ expense, onPress }: ExpenseItemCardProps) {
  const docNumber = expense.series && expense.number
    ? `${expense.series}-${expense.number}`
    : (expense.series || expense.number || 'S/N');

  const getDocTypeColor = (type: string) => {
    switch (type) {
      case 'FACTURA':
        return { bg: '#E0F2FE', text: '#0369A1' };
      case 'BOLETA':
        return { bg: '#FEF3C7', text: '#B45309' };
      case 'TICKET':
        return { bg: '#F3E8FF', text: '#7E22CE' };
      default:
        return { bg: '#F1F5F9', text: '#475569' };
    }
  };

  const docColors = getDocTypeColor(expense.document_type);

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={onPress}
      style={styles.card}
    >
      {/* Thumbnail */}
      <View style={styles.thumbnailContainer}>
        {expense.photo_uri ? (
          <Image source={{ uri: expense.photo_uri }} style={styles.thumbnail} />
        ) : (
          <View style={styles.thumbnailPlaceholder}>
            <Ionicons name="document-text-outline" size={22} color={COLORS.textMuted} />
          </View>
        )}
      </View>

      {/* Info */}
      <View style={styles.contentContainer}>
        <View style={styles.topRow}>
          <View style={[styles.docTypeBadge, { backgroundColor: docColors.bg }]}>
            <Text style={[styles.docTypeText, { color: docColors.text }]}>
              {expense.document_type}
            </Text>
          </View>
          <Text style={styles.seriesNumber}>{docNumber}</Text>
          <Text style={styles.dateText}>{expense.date}</Text>
        </View>

        <Text style={styles.vendorText} numberOfLines={1}>
          {expense.vendor_name || 'Sin proveedor especificado'}
        </Text>

        <View style={styles.bottomRow}>
          <View style={styles.categoryPill}>
            <Text style={styles.categoryText}>{expense.category}</Text>
          </View>
          <Text style={styles.amountText}>
            S/ {expense.total_amount.toFixed(2)}
          </Text>
        </View>
      </View>

      <Ionicons name="chevron-forward" size={18} color={COLORS.cardBorder} style={styles.chevron} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  thumbnailContainer: {
    width: 54,
    height: 54,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#F1F5F9',
    marginRight: 12,
  },
  thumbnail: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  thumbnailPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentContainer: {
    flex: 1,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  docTypeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 6,
  },
  docTypeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  seriesNumber: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textMuted,
    fontFamily: 'monospace',
    marginRight: 'auto',
  },
  dateText: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  vendorText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryPill: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  categoryText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  amountText: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.primary,
  },
  chevron: {
    marginLeft: 6,
  },
});
