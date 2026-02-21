import React from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { Moment } from '../lib/api';

interface MomentCardProps {
  moment: Moment;
  onLike: (momentId: string) => void;
}

export function MomentCard({ moment, onLike }: MomentCardProps) {
  const characterImage =
    moment.characterImage ?? 'https://via.placeholder.com/40';

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <Image source={{ uri: characterImage }} style={styles.avatar} />
        <View style={styles.headerText}>
          <Text style={styles.characterName}>{moment.characterName}</Text>
          <Text style={styles.timestamp}>
            {new Date(moment.createdAt).toLocaleDateString()}
          </Text>
        </View>
      </View>

      {/* Content */}
      {moment.isLocked ? (
        <View style={styles.lockedContainer}>
          {moment.imageUrl ? (
            <Image
              source={{ uri: moment.imageUrl }}
              style={[styles.momentImage, styles.blurred]}
              blurRadius={20}
            />
          ) : null}
          <View style={styles.lockedOverlay}>
            <Text style={styles.lockIcon}>🔒</Text>
            <Text style={styles.lockedText}>Unlock to view</Text>
          </View>
        </View>
      ) : (
        <View>
          <Text style={styles.content}>{moment.content}</Text>
          {moment.imageUrl ? (
            <Image source={{ uri: moment.imageUrl }} style={styles.momentImage} />
          ) : null}
        </View>
      )}

      {/* Actions */}
      <View style={styles.actions}>
        <Pressable
          style={({ pressed }) => [styles.likeButton, pressed && styles.pressed]}
          onPress={() => onLike(moment.id)}
          disabled={moment.isLocked}
        >
          <Text style={styles.likeIcon}>{moment.isLiked ? '❤️' : '🤍'}</Text>
          <Text style={styles.likesCount}>{moment.likesCount}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#141414',
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2a2a2a',
  },
  headerText: {
    marginLeft: 10,
  },
  characterName: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
  timestamp: {
    color: '#6b7280',
    fontSize: 11,
    marginTop: 1,
  },
  content: {
    color: '#e5e7eb',
    fontSize: 14,
    lineHeight: 20,
    paddingHorizontal: 12,
    paddingBottom: 10,
  },
  momentImage: {
    width: '100%',
    height: 220,
    resizeMode: 'cover',
  },
  blurred: {
    opacity: 0.4,
  },
  lockedContainer: {
    position: 'relative',
    height: 220,
    backgroundColor: '#0a0a0a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockedOverlay: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  lockedText: {
    color: '#9ca3af',
    fontSize: 14,
  },
  actions: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#2a2a2a',
  },
  likeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pressed: {
    opacity: 0.6,
  },
  likeIcon: {
    fontSize: 20,
  },
  likesCount: {
    color: '#9ca3af',
    fontSize: 13,
  },
});
