import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface RelationshipBarProps {
  level: number;
  currentXp: number;
  nextLevelXp: number;
  label?: string;
}

export function RelationshipBar({
  level,
  currentXp,
  nextLevelXp,
  label = 'Bond Level',
}: RelationshipBarProps) {
  const progress = nextLevelXp > 0 ? Math.min(currentXp / nextLevelXp, 1) : 0;
  const percentage = Math.round(progress * 100);
  // React Native ViewStyle width accepts `${number}%` strings
  const fillWidth: `${number}%` = `${percentage}%`;

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.level}>Lv. {level}</Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: fillWidth }]} />
      </View>
      <Text style={styles.xpText}>
        {currentXp.toLocaleString()} / {nextLevelXp.toLocaleString()} XP
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  label: {
    color: '#9ca3af',
    fontSize: 13,
  },
  level: {
    color: '#a855f7',
    fontSize: 14,
    fontWeight: '700',
  },
  track: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2a2a2a',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: '#a855f7',
  },
  xpText: {
    color: '#6b7280',
    fontSize: 11,
    marginTop: 4,
    textAlign: 'right',
  },
});
