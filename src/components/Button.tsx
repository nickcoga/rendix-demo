import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
  View
} from 'react-native';
import { COLORS } from '../constants/theme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'accent' | 'outline' | 'danger' | 'secondary';
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
  size?: 'normal' | 'large' | 'small';
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  icon,
  style,
  textStyle,
  size = 'normal'
}: ButtonProps) {
  const getContainerStyle = () => {
    switch (variant) {
      case 'accent':
        return styles.btnAccent;
      case 'outline':
        return styles.btnOutline;
      case 'danger':
        return styles.btnDanger;
      case 'secondary':
        return styles.btnSecondary;
      case 'primary':
      default:
        return styles.btnPrimary;
    }
  };

  const getTextStyle = () => {
    switch (variant) {
      case 'accent':
        return styles.textAccent;
      case 'outline':
        return styles.textOutline;
      case 'danger':
        return styles.textDanger;
      case 'secondary':
        return styles.textSecondary;
      case 'primary':
      default:
        return styles.textPrimary;
    }
  };

  const getSizeStyle = () => {
    switch (size) {
      case 'small':
        return styles.sizeSmall;
      case 'large':
        return styles.sizeLarge;
      case 'normal':
      default:
        return styles.sizeNormal;
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.base,
        getSizeStyle(),
        getContainerStyle(),
        (disabled || loading) && styles.disabled,
        style
      ]}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'outline' || variant === 'accent' ? COLORS.primary : COLORS.textWhite}
        />
      ) : (
        <View style={styles.content}>
          {icon && <View style={styles.iconWrapper}>{icon}</View>}
          <Text style={[styles.baseText, getTextStyle(), textStyle]}>
            {title}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  sizeSmall: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    minHeight: 38,
  },
  sizeNormal: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    minHeight: 50,
  },
  sizeLarge: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    minHeight: 56,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapper: {
    marginRight: 8,
  },
  baseText: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  // Variant styles
  btnPrimary: {
    backgroundColor: COLORS.primary,
  },
  textPrimary: {
    color: COLORS.textWhite,
  },
  btnAccent: {
    backgroundColor: COLORS.accent,
  },
  textAccent: {
    color: COLORS.primary,
  },
  btnOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: COLORS.primary,
  },
  textOutline: {
    color: COLORS.primary,
  },
  btnSecondary: {
    backgroundColor: COLORS.primaryLight,
  },
  textSecondary: {
    color: COLORS.textWhite,
  },
  btnDanger: {
    backgroundColor: COLORS.danger,
  },
  textDanger: {
    color: COLORS.textWhite,
  },
  disabled: {
    opacity: 0.5,
  },
});
