import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Send } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ApiClient } from '../api';
import { ThemeColors } from '../theme';

interface SupportChatScreenProps {
  currentUser: any;
  onBack: () => void;
  isDark?: boolean;
}

export default function SupportChatScreen({
  currentUser,
  onBack,
  isDark = false
}: SupportChatScreenProps) {
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const loadMessages = async (showLoading = false) => {
    if (showLoading) setLoading(true);
    const res = await ApiClient.getSupportMessages(currentUser.id, true);
    if (res.success) {
      setMessages(res.messages || []);
      
      // Update AsyncStorage seen list so background polling in App.tsx doesn't trigger duplicate notifications
      try {
        const messageIds = (res.messages || []).map((m: any) => m.id);
        if (messageIds.length > 0) {
          const storageKey = `seen_messages_${currentUser.id}`;
          const stored = await AsyncStorage.getItem(storageKey);
          let seenIds: string[] = stored ? JSON.parse(stored) : [];
          
          let changed = false;
          for (const id of messageIds) {
            if (!seenIds.includes(id)) {
              seenIds.push(id);
              changed = true;
            }
          }
          if (changed) {
            await AsyncStorage.setItem(storageKey, JSON.stringify(seenIds));
          }
        }
      } catch (err) {
        console.error("Error updating seen messages in chat screen:", err);
      }
    }
    if (showLoading) setLoading(false);
  };

  useEffect(() => {
    loadMessages(true);

    // Poll for new messages every 3 seconds
    const interval = setInterval(() => {
      loadMessages(false);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const handleSend = async () => {
    if (!inputText.trim()) return;
    const text = inputText.trim();
    setInputText('');
    setSending(true);

    const res = await ApiClient.sendSupportMessage(currentUser.id, 'STUDENT', text);
    if (res.success) {
      // Append the message locally
      setMessages(prev => [...prev, res.message]);
      // Scroll to bottom
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } else {
      alert(res.error || 'Failed to send message.');
    }
    setSending(false);
  };

  const renderItem = ({ item }: { item: any }) => {
    const isMe = item.sender === 'STUDENT';
    return (
      <View style={[
        styles.messageContainer,
        isMe ? styles.messageContainerRight : styles.messageContainerLeft
      ]}>
        <View style={[
          styles.messageBubble,
          isMe 
            ? [styles.messageBubbleRight, isDark && { backgroundColor: '#2563EB' }] 
            : [styles.messageBubbleLeft, isDark && { backgroundColor: '#16223F', borderColor: '#1F2E54' }]
        ]}>
          <Text style={[
            styles.messageText,
            isMe ? styles.messageTextRight : [styles.messageTextLeft, isDark && { color: '#E2E8F0' }]
          ]}>
            {item.message}
          </Text>
          <Text style={[
            styles.messageTime,
            isMe ? styles.messageTimeRight : styles.messageTimeLeft
          ]}>
            {item.createdAt ? new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, isDark && { backgroundColor: ThemeColors.dark.bg }]}>
      {/* Header */}
      <View style={[styles.header, isDark && { backgroundColor: ThemeColors.dark.headerBg, borderBottomColor: ThemeColors.dark.border }]}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <ArrowLeft color={isDark ? '#60A5FA' : '#2563EB'} size={24} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={[styles.headerTitle, isDark && { color: ThemeColors.dark.text }]}>Support Team</Text>
          <Text style={styles.headerSubtitle}>Real-time assistance</Text>
        </View>
      </View>

      {/* Message List */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#2563EB" />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={item => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={[styles.emptyText, isDark && { color: ThemeColors.dark.textMuted }]}>
                  Welcome to Support! Send a message below to start chatting with our team.
                </Text>
              </View>
            }
          />
        )}

        {/* Input Bar */}
        <View style={[styles.inputBar, isDark && { backgroundColor: ThemeColors.dark.headerBg, borderTopColor: ThemeColors.dark.border }]}>
          <TextInput
            style={[
              styles.textInput,
              isDark && { 
                backgroundColor: ThemeColors.dark.inputBg, 
                borderColor: ThemeColors.dark.inputBorder, 
                color: ThemeColors.dark.text 
              }
            ]}
            placeholder="Type your message here..."
            placeholderTextColor={isDark ? '#64748B' : '#9CA3AF'}
            value={inputText}
            onChangeText={setInputText}
            multiline
          />
          <TouchableOpacity 
            style={[styles.sendBtn, !inputText.trim() && styles.sendBtnDisabled]} 
            onPress={handleSend}
            disabled={!inputText.trim() || sending}
          >
            <Send color="#FFF" size={16} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    height: 56,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  backBtn: {
    marginRight: 16,
  },
  headerTitleContainer: {
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#10B981',
    fontWeight: '600',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
    paddingBottom: 24,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 12,
    width: '100%',
  },
  messageContainerLeft: {
    justifyContent: 'flex-start',
  },
  messageContainerRight: {
    justifyContent: 'flex-end',
  },
  messageBubble: {
    maxWidth: '80%',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
  },
  messageBubbleLeft: {
    backgroundColor: '#FFF',
    borderColor: '#E5E7EB',
    borderBottomLeftRadius: 4,
  },
  messageBubbleRight: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
    borderBottomRightRadius: 4,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  messageTextLeft: {
    color: '#1F2937',
  },
  messageTextRight: {
    color: '#FFF',
  },
  messageTime: {
    fontSize: 9,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  messageTimeLeft: {
    color: '#9CA3AF',
  },
  messageTimeRight: {
    color: '#BFDBFE',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 100,
    paddingHorizontal: 32,
  },
  emptyText: {
    textAlign: 'center',
    color: '#6B7280',
    fontSize: 13,
    lineHeight: 20,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    padding: 12,
    gap: 8,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    maxHeight: 100,
    fontSize: 13,
    color: '#1F2937',
    backgroundColor: '#F9FAFB',
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: '#93C5FD',
  },
});
