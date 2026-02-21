import React from 'react';
import {
  Image,
  Pressable,
  Text,
  View,
  StyleSheet,
} from 'react-native';
import type { Character } from '../lib/api';

interface CharacterCardProps {
  character: Character;
  onPress: (character: Character) => void;
}

export function CharacterCard({ character, onPress }: CharacterCardProps) {
  const imageUri =
    character.imageUrl ?? character.avatar ?? 'https://via.placeholder.com/150';

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      onPress={() => onPress(character)}
    >
      <Image source={{ uri: imageUri }} style={styles.image} />
      <View style={styles.overlay}>
        <Text style={styles.name}>{character.name}</Text>
        {character.description ? (
          <Text style={styles.description} numberOfLines={2}>
            {character.description}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '48%',
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#141414',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  image: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
  overlay: {
    padding: 12,
    backgroundColor: 'rgba(10,10,10,0.9)',
  },
  name: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  description: {
    color: '#9ca3af',
    fontSize: 12,
    lineHeight: 16,
  },
});
