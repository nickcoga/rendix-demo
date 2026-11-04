import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';
import { type FieldStatus } from '../types';

interface StatusBadgeProps {
  status: FieldStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  if (status === 'ai_detected') {
    return (
      <View style={[styles.badge, styles.aiBadge]}>
        <Ionicons name="sparkles" size={11} color={COLORS.aiBadgeText} style={styles.icon} />
        <Text style={[styles.text, { color: COLORS.aiBadgeText }]}>Detectado por IA — revisar</Text>
      </View>
    );
  }

  if (status === 'manually_edited') {
    return (
      <View style={[styles.badge, styles.editedBadge]}>
        <Ionicons name="pencil" size={11} color={COLORS.editedBadgeText} style={styles.icon} />
        <Text style={[styles.text, { color: COLORS.editedBadgeText }]}>Editado manualmente</Text>
      </View>
    );
  }

  return (
    <View style={[styles.badge, styles.emptyBadge]}>
      <Ionicons name="ellipse-outline" size={10} color={COLORS.emptyBadgeText} style={styles.icon} />
      <Text style={[styles.text, { color: COLORS.emptyBadgeText }]}>No detectado</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    alignSelf: 'flex-start',
    marginTop: 2,
    marginBottom: 4,
  },
  icon: {
    marginRight: 4,
  },
  text: {
    fontSize: 10,
    fontWeight: '600',
  },
  aiBadge: {
    backgroundColor: COLORS.aiBadgeBg,
    borderColor: COLORS.aiBadgeBorder,
  },
  editedBadge: {
    backgroundColor: COLORS.editedBadgeBg,
    borderColor: COLORS.editedBadgeBorder,
  },
  emptyBadge: {
    backgroundColor: COLORS.emptyBadgeBg,
    borderColor: COLORS.emptyBadgeBorder,
  },
});
