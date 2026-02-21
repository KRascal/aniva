import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { RelationshipBar } from '../../../components/RelationshipBar';
import type { Relationship } from '../../../lib/api';
import { fetchRelationship } from '../../../lib/api';

const LEVEL_NAMES: Record<number, string> = {
  1: 'Acquaintance',
  2: 'Friend',
  3: 'Close Friend',
  4: 'Confidant',
  5: 'Soulmate',
};

function getLevelName(level: number): string {
  return LEVEL_NAMES[level] ?? `Level ${level}`;
}

export default function ProfileScreen() {
  const { characterId } = useLocalSearchParams<{ characterId: string }>();
  const [relationship, setRelationship] = useState<Relationship | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!characterId) return;

    async function load() {
      try {
        const data = await fetchRelationship(characterId);
        setRelationship(data);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to load profile.',
        );
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [characterId]);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backIcon}>‹</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Relationship</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#a855f7" />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : relationship ? (
        <ScrollView contentContainerStyle={styles.content}>
          {/* Level badge */}
          <View style={styles.levelBadge}>
            <Text style={styles.levelEmoji}>💖</Text>
            <Text style={styles.levelName}>{getLevelName(relationship.level)}</Text>
            <Text style={styles.levelNumber}>Level {relationship.level}</Text>
          </View>

          {/* Relationship bar */}
          <View style={styles.barContainer}>
            <RelationshipBar
              level={relationship.level}
              currentXp={relationship.experiencePoints}
              nextLevelXp={relationship.nextLevelXp}
              label="Bond Progress"
            />
          </View>

          {/* Chat button */}
          <Pressable
            style={({ pressed }) => [
              styles.chatButton,
              pressed && styles.chatButtonPressed,
            ]}
            onPress={() => router.push(`/(app)/chat/${characterId}`)}
          >
            <Text style={styles.chatButtonText}>💬 Continue Chatting</Text>
          </Pressable>

          {/* Milestones */}
          {relationship.milestones.length > 0 && (
            <View style={styles.milestonesSection}>
              <Text style={styles.sectionTitle}>Milestones</Text>
              {relationship.milestones.map((milestone) => (
                <View key={milestone.id} style={styles.milestoneCard}>
                  <View style={styles.milestoneHeader}>
                    <Text style={styles.milestoneIcon}>🏆</Text>
                    <Text style={styles.milestoneTitle}>{milestone.title}</Text>
                  </View>
                  <Text style={styles.milestoneDescription}>
                    {milestone.description}
                  </Text>
                  <Text style={styles.milestoneDate}>
                    Unlocked {new Date(milestone.unlockedAt).toLocaleDateString()}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 52,
    paddingBottom: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  backButton: {
    padding: 8,
  },
  backIcon: {
    color: '#a855f7',
    fontSize: 32,
    lineHeight: 32,
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
    textAlign: 'center',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  levelBadge: {
    alignItems: 'center',
    marginBottom: 32,
    paddingTop: 16,
  },
  levelEmoji: {
    fontSize: 64,
    marginBottom: 8,
  },
  levelName: {
    color: '#a855f7',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 4,
  },
  levelNumber: {
    color: '#6b7280',
    fontSize: 14,
  },
  barContainer: {
    backgroundColor: '#141414',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  chatButton: {
    backgroundColor: '#a855f7',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 28,
  },
  chatButtonPressed: {
    opacity: 0.85,
  },
  chatButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  milestonesSection: {
    gap: 12,
  },
  sectionTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  milestoneCard: {
    backgroundColor: '#141414',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  milestoneHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  milestoneIcon: {
    fontSize: 18,
  },
  milestoneTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  milestoneDescription: {
    color: '#9ca3af',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 6,
  },
  milestoneDate: {
    color: '#6b7280',
    fontSize: 11,
  },
});
