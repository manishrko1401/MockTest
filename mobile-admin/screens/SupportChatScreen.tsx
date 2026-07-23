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
  ActivityIndicator,
  StatusBar,
  Alert
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Send } from 'lucide-react-native';
import { ApiClient } from '../api';
import { ThemeColors } from '../theme';

interface SupportChatScreenProps {
  currentUser: any;
  studentUser: any;
  onBack: () => void;
  isDark?: boolean;
}

export default function SupportChatScreen({
  currentUser,
  studentUser,
  onBack,
  isDark = true
}: SupportChatScreenProps) {
  const insets = useSafeAreaInsets();
  const theme = isDark ? ThemeColors.dark : ThemeColors.light;

  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const targetUserId = studentUser.id;

  const loadMessages = async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const res = await ApiClient.getSupportMessages(targetUserId, true);
      if (res.success) {
        setMessages(res.messages || []);
      }
    } catch (e) {
      console.warn("Failed to load support messages:", e);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    loadMessages(true);

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

    try {
      const res = await ApiClient.sendSupportMessage(targetUserId, text);
      if (res.success) {
        setMessages(prev => [...prev, res.message]);
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      } else {
        Alert.alert('Error', res.error || 'Failed to send message.');
      }
    } catch (e) {
      Alert.alert('Error', 'Connection failed.');
    } finally {
      setSending(false);
    }
  };

  const renderItem = ({ item }: { item: any }) => {
    const isMe = item.sender === 'ADMIN';
    return (
      <View style={[
        styles.messageContainer,
        isMe ? styles.messageContainerRight : styles.messageContainerLeft
      ]}>
        <View style={[
          styles.messageBubble,
          isMe 
            ? [styles.messageBubbleRight, { backgroundColor: theme.primary, borderColor: theme.primary }] 
            : [styles.messageBubbleLeft, { backgroundColor: theme.card, borderColor: theme.border }]
        ]}>
          <Text style={[
            styles.messageText,
            isMe ? styles.messageTextRight : { color: theme.text }
          ]}>
            {item.message}
          </Text>
          <Text style={[
            styles.messageTime,
            isMe ? styles.messageTimeRight : { color: theme.textMuted }
          ]}>
            {item.createdAt ? new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <StatusBar barStyle="light-content" backgroundColor={theme.headerBg} />
      
      {/* Header */}
      <View style={[
        styles.header, 
        { backgroundColor: theme.headerBg, borderBottomColor: theme.border },
        { height: 56 + insets.top, paddingTop: insets.top }
      ]}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <ArrowLeft color={theme.primary} size={24} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>
            Chat with {studentUser.name}
          </Text>
          <Text style={[styles.headerSubtitle, { color: theme.accentGreen }]}>
            Candidate Code: {studentUser.candidateCode || 'N/A'}
          </Text>
        </View>
      </View>

      {/* Message List */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={theme.primary} />
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
                <Text style={[styles.emptyText, { color: theme.textMuted }]}>
                  No messages yet. Send a message to start support assistance.
                </Text>
              </View>
            }
          />
        )}

        {/* Input Bar */}
        <View style={[
          styles.inputBar, 
          { backgroundColor: theme.headerBg, borderTopColor: theme.border },
          { paddingBottom: Math.max(insets.bottom, 12) }
        ]}>
          <TextInput
            style={[
              styles.textInput,
              { 
                backgroundColor: theme.inputBg, 
                borderColor: theme.inputBorder, 
                color: theme.text 
              }
            ]}
            placeholder="Type response..."
            placeholderTextColor={theme.textMuted}
            value={inputText}
            onChangeText={setInputText}
            multiline
          />
          <TouchableOpacity 
            style={[styles.sendBtn, { backgroundColor: theme.primary }, !inputText.trim() && styles.sendBtnDisabled]} 
            onPress={handleSend}
            disabled={!inputText.trim() || sending}
          >
            <Send color="#FFF" size={16} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    borderBottomWidth: 1,
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
  },
  headerSubtitle: {
    fontSize: 11,
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
    borderBottomLeftRadius: 4,
  },
  messageBubbleRight: {
    borderBottomRightRadius: 4,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  messageTextRight: {
    color: '#FFF',
  },
  messageTime: {
    fontSize: 9,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  messageTimeRight: {
    color: '#E0E7FF',
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
    fontSize: 13,
    lineHeight: 20,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    padding: 12,
    gap: 8,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    maxHeight: 100,
    fontSize: 13,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.5,
  },
});
