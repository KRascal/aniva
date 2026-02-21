import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { MomentCard } from '../../components/MomentCard';
import type { Moment } from '../../lib/api';
import { fetchMoments, reactToMoment } from '../../lib/api';

export default function MomentsScreen() {
  const [moments, setMoments] = useState<Moment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadMoments = useCallback(async () => {
    try {
      setError(null);
      const data = await fetchMoments();
      setMoments(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load moments.',
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadMoments();
  }, [loadMoments]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadMoments();
  }, [loadMoments]);

  const handleLike = useCallback(async (momentId: string) => {
    // Optimistic update
    setMoments((prev) =>
      prev.map((m) =>
        m.id === momentId
          ? {
              ...m,
              isLiked: !m.isLiked,
              likesCount: m.isLiked ? m.likesCount - 1 : m.likesCount + 1,
            }
          : m,
      ),
    );

    try {
      await reactToMoment(momentId);
    } catch {
      // Revert optimistic update on error
      setMoments((prev) =>
        prev.map((m) =>
          m.id === momentId
            ? {
                ...m,
                isLiked: !m.isLiked,
                likesCount: m.isLiked ? m.likesCount - 1 : m.likesCount + 1,
              }
            : m,
        ),
      );
    }
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Moments 💫</Text>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#a855f7" />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <FlatList
          data={moments}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#a855f7"
            />
          }
          renderItem={({ item }) => (
            <MomentCard moment={item} onLike={handleLike} />
          )}
          ListEmptyComponent={
            <View style={styles.centered}>
              <Text style={styles.emptyEmoji}>🫧</Text>
              <Text style={styles.emptyText}>No moments yet. Check back soon!</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  header: {
    paddingTop: 56,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  title: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '800',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
    textAlign: 'center',
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    color: '#6b7280',
    fontSize: 14,
    textAlign: 'center',
  },
});
