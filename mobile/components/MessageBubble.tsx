import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Message } from '../lib/api';

interface MessageBubbleProps {
  message: Message;
  onPlayAudio?: (audioUrl: string) => void;
}

export function MessageBubble({ message, onPlayAudio }: MessageBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <View style={[styles.container, isUser ? styles.userContainer : styles.aiContainer]}>
      <View style={[styles.bubble, isUser ? styles.userBubble : styles.aiBubble]}>
        <Text style={[styles.text, isUser ? styles.userText : styles.aiText]}>
          {message.content}
        </Text>
        {!isUser && message.audioUrl && onPlayAudio ? (
          <Pressable
            style={styles.audioButton}
            onPress={() => onPlayAudio(message.audioUrl!)}
          >
            <Text style={styles.audioIcon}>🔊</Text>
          </Pressable>
        ) : null}
      </View>
      <Text style={styles.timestamp}>
        {new Date(message.createdAt).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        })}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
    maxWidth: '80%',
  },
  userContainer: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
  },
  aiContainer: {
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
  },
  bubble: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  userBubble: {
    backgroundColor: '#a855f7',
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    backgroundColor: '#1f1f1f',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  text: {
    fontSize: 15,
    lineHeight: 22,
  },
  userText: {
    color: '#ffffff',
  },
  aiText: {
    color: '#f3f4f6',
  },
  audioButton: {
    marginTop: 6,
    alignSelf: 'flex-end',
  },
  audioIcon: {
    fontSize: 18,
  },
  timestamp: {
    color: '#6b7280',
    fontSize: 10,
    marginTop: 2,
    marginHorizontal: 4,
  },
});
