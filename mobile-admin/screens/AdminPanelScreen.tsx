import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  FlatList,
  TextInput,
  Modal,
  ActivityIndicator,
  Alert,
  Switch,
  Platform,
  RefreshControl
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Users,
  Shield,
  MessageSquare,
  AlertTriangle,
  RefreshCw,
  Search,
  CheckCircle,
  Database,
  Coins,
  ChevronRight,
  Star,
  FileText,
  Trash2,
  Edit3,
  Calendar,
  Layers,
  BarChart2
} from 'lucide-react-native';
import { ApiClient } from '../api';
import { ThemeColors } from '../theme';

interface AdminPanelScreenProps {
  currentUser: any;
  onBack: () => void;
  isDark?: boolean;
  onOpenSupportChat: (studentUser: any) => void;
  onOpenAnalytics: () => void;
}

type TabType = 'users' | 'support' | 'reports' | 'feedback' | 'suggestions' | 'attempts';

export default function AdminPanelScreen({
  currentUser,
  onBack,
  isDark = true,
  onOpenSupportChat,
  onOpenAnalytics
}: AdminPanelScreenProps) {
  const insets = useSafeAreaInsets();
  const theme = isDark ? ThemeColors.dark : ThemeColors.light;

  const [activeTab, setActiveTab] = useState<TabType>('users');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Database lists
  const [users, setUsers] = useState<any[]>([]);
  const [reportedQs, setReportedQs] = useState<any[]>([]);
  const [supportConversations, setSupportConversations] = useState<any[]>([]);
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [attempts, setAttempts] = useState<any[]>([]);

  // Search/Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');

  // Modal actions (User)
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [editUserModalVisible, setEditUserModalVisible] = useState(false);
  const [editTier, setEditTier] = useState('None');
  const [editCoins, setEditCoins] = useState('0');
  const [editBlocked, setEditBlocked] = useState(false);
  const [editRole, setEditRole] = useState('STUDENT');
  const [editPurchasedAt, setEditPurchasedAt] = useState('');
  const [editExpiresAt, setEditExpiresAt] = useState('');
  const [updatingUser, setUpdatingUser] = useState(false);

  // Modal actions (Suggestion)
  const [selectedSuggestion, setSelectedSuggestion] = useState<any | null>(null);
  const [suggestionModalVisible, setSuggestionModalVisible] = useState(false);
  const [suggStatus, setSuggStatus] = useState('PENDING');
  const [suggReply, setSuggReply] = useState('');
  const [updatingSugg, setUpdatingSugg] = useState(false);

  // Load all data logs from the backend
  const loadAdminLogs = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);

    try {
      // 1. Fetch Admin Data (users & reported questions)
      const res = await ApiClient.fetchAdminData(currentUser.id);
      if (res.success) {
        setUsers(res.usersList || []);
        setReportedQs(res.reportedQuestionsList || []);
      }

      // 2. Fetch Support conversations list
      const supRes = await ApiClient.getSupportUsers();
      if (supRes.success) {
        setSupportConversations(supRes.users || []);
      }

      // 3. Fetch Feedbacks & Ratings
      const fbRes = await ApiClient.fetchFeedbacks();
      if (fbRes.success) {
        setFeedbacks(fbRes.feedbacks || fbRes.data || []);
      }

      // 4. Fetch Suggestions list
      const sugListRes = await ApiClient.getSuggestions();
      if (sugListRes.success) {
        setSuggestions(sugListRes.suggestions || []);
      }

      // 5. Fetch Test Attempts list
      const attsRes = await ApiClient.getAttempts();
      if (attsRes.success) {
        setAttempts(attsRes.attempts || []);
      }

    } catch (err: any) {
      console.warn("Failed to fetch admin logs:", err);
      Alert.alert("Sync Error", "Could not fetch administrative logs from backend.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAdminLogs();
  }, []);

  const formatDateString = (dateVal: any) => {
    if (!dateVal) return '';
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return '';
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Modify User profile
  const openEditUserModal = (user: any) => {
    setSelectedUser(user);
    setEditTier(user.subscriptionTier || 'None');
    setEditCoins(String(user.coins ?? 0));
    setEditBlocked(user.isBlocked ?? false);
    setEditRole(user.role || 'STUDENT');
    setEditPurchasedAt(formatDateString(user.subscriptionPurchasedAt));
    setEditExpiresAt(formatDateString(user.subscriptionExpiresAt));
    setEditUserModalVisible(true);
  };

  const handleSaveUser = async () => {
    if (!selectedUser) return;
    setUpdatingUser(true);
    try {
      const parsedCoins = parseInt(editCoins) || 0;

      const parseDateParam = (val: string) => {
        if (!val.trim()) return null;
        const d = new Date(val.trim());
        if (isNaN(d.getTime())) {
          throw new Error(`Invalid date format entered: "${val}". Please use YYYY-MM-DD format.`);
        }
        return d.toISOString();
      };

      let parsedPurchasedAt = null;
      let parsedExpiresAt = null;
      try {
        parsedPurchasedAt = parseDateParam(editPurchasedAt);
        parsedExpiresAt = parseDateParam(editExpiresAt);
      } catch (err: any) {
        Alert.alert('Invalid Date', err.message);
        setUpdatingUser(false);
        return;
      }

      const params = {
        userId: selectedUser.id,
        name: selectedUser.name,
        email: selectedUser.email,
        mobile: selectedUser.mobile || '',
        referralCode: selectedUser.referralCode || '',
        referredBy: selectedUser.referredBy || null,
        referralsCount: selectedUser.referralsCount || 0,
        role: editRole,
        tier: editTier,
        purchasedAt: parsedPurchasedAt,
        expiry: parsedExpiresAt,
        password: selectedUser.password || 'password123',
        isBlocked: editBlocked,
        coins: parsedCoins
      };

      const res = await ApiClient.saveProfileAdmin(params);
      if (res.success) {
        setEditUserModalVisible(false);
        setUsers(prev =>
          prev.map(u =>
            u.id === selectedUser.id
              ? {
                  ...u,
                  role: editRole,
                  subscriptionTier: editTier,
                  coins: parsedCoins,
                  isBlocked: editBlocked,
                  subscriptionPurchasedAt: parsedPurchasedAt,
                  subscriptionExpiresAt: parsedExpiresAt
                }
              : u
          )
        );
        Alert.alert('Success', 'User profile modifications applied.');
      } else {
        Alert.alert('Error', res.error || 'Failed to update user profile');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Operation failed');
    } finally {
      setUpdatingUser(false);
    }
  };

  // Modify Suggestion Status / Reply
  const openSuggestionModal = (sugg: any) => {
    setSelectedSuggestion(sugg);
    setSuggStatus(sugg.status || 'PENDING');
    setSuggReply(sugg.adminReply || '');
    setSuggestionModalVisible(true);
  };

  const handleSaveSuggestion = async () => {
    if (!selectedSuggestion) return;
    setUpdatingSugg(true);
    try {
      const res = await ApiClient.updateSuggestionStatus(
        selectedSuggestion.id,
        suggStatus,
        suggReply
      );
      if (res.success) {
        setSuggestionModalVisible(false);
        setSuggestions(prev =>
          prev.map(s =>
            s.id === selectedSuggestion.id
              ? { ...s, status: suggStatus, adminReply: suggReply }
              : s
          )
        );
        Alert.alert('Success', 'Suggestion details updated.');
      } else {
        Alert.alert('Error', res.error || 'Failed to update suggestion');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Operation failed');
    } finally {
      setUpdatingSugg(false);
    }
  };

  const handleDeleteSuggestionLog = async (id: string) => {
    Alert.alert('Delete Suggestion', 'Delete this suggestion permanently?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const res = await ApiClient.deleteSuggestion(id);
          if (res.success) {
            setSuggestions(prev => prev.filter(s => s.id !== id));
          } else {
            Alert.alert('Error', res.error || 'Failed to delete suggestion');
          }
        }
      }
    ]);
  };

  // Delete Feedback
  const handleDeleteFeedbackLog = async (id: string) => {
    Alert.alert('Delete Feedback', 'Delete this feedback log entry?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const res = await ApiClient.deleteFeedback(id);
          if (res.success) {
            setFeedbacks(prev => prev.filter(f => f.id !== id));
          } else {
            Alert.alert('Error', res.error || 'Failed to delete feedback');
          }
        }
      }
    ]);
  };

  // Resolve Reported Question
  const handleResolveReport = async (id: string) => {
    Alert.alert('Resolve Flag', 'Mark this question report as resolved?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Resolve',
        style: 'destructive',
        onPress: async () => {
          const res = await ApiClient.deleteReportedQuestion(id);
          if (res.success) {
            setReportedQs(prev => prev.filter(r => r.id !== id));
          } else {
            Alert.alert('Error', res.error || 'Failed to clear report log');
          }
        }
      }
    ]);
  };

  // Reset Attempt
  const handleResetAttemptLog = async (userId: string, sessionId: string, userName: string) => {
    Alert.alert('Reset Attempt', `Allow ${userName} to re-take this exam session?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset',
        style: 'destructive',
        onPress: async () => {
          const res = await ApiClient.resetAttempt(userId, sessionId);
          if (res.success) {
            setAttempts(prev => prev.filter(a => a.id !== sessionId));
            Alert.alert('Success', 'Test attempt reset. Student can re-attempt.');
          } else {
            Alert.alert('Error', res.error || 'Failed to reset attempt');
          }
        }
      }
    ]);
  };

  // Filters for user list
  const filteredUsers = users.filter(user => {
    const term = searchQuery.toLowerCase();
    const matchesSearch =
      user.name?.toLowerCase().includes(term) ||
      user.email?.toLowerCase().includes(term) ||
      user.candidateCode?.toLowerCase().includes(term) ||
      (user.mobile && user.mobile.includes(term));

    if (!matchesSearch) return false;
    if (roleFilter !== 'ALL' && user.role !== roleFilter) return false;
    return true;
  });

  const renderTabHeader = () => {
    const tabs: { id: TabType; label: string }[] = [
      { id: 'users', label: 'Users' },
      { id: 'support', label: 'Support Chat' },
      { id: 'reports', label: 'Reported Qs' },
      { id: 'feedback', label: 'Feedback' },
      { id: 'suggestions', label: 'Suggestions' },
      { id: 'attempts', label: 'Attempts' }
    ];

    return (
      <View style={[styles.tabBar, { borderBottomColor: theme.border, backgroundColor: theme.card }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScroll}>
          {tabs.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                onPress={() => {
                  setActiveTab(tab.id);
                  setSearchQuery('');
                }}
                style={[styles.tabItem, active && [styles.activeTabItem, { borderBottomColor: theme.primary }]]}
              >
                <Text style={[styles.tabText, { color: active ? theme.primary : theme.textMuted }]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    );
  };

  // 1. Users list view
  const renderUsersView = () => {
    return (
      <View style={styles.tabViewContainer}>
        <View style={[styles.searchContainer, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
          <View style={[styles.searchBox, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder }]}>
            <Search size={18} color={theme.textMuted} style={{ marginRight: 8 }} />
            <TextInput
              style={[styles.searchInput, { color: theme.text }]}
              placeholder="Search users..."
              placeholderTextColor={theme.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
            {['ALL', 'STUDENT', 'ADMIN', 'SUPPORT_TEAM', 'NOTICES_MANAGER'].map((role) => (
              <TouchableOpacity
                key={role}
                onPress={() => setRoleFilter(role)}
                style={[
                  styles.filterBadge,
                  { backgroundColor: roleFilter === role ? theme.primary : theme.inputBg, borderColor: theme.border }
                ]}
              >
                <Text style={[styles.filterBadgeText, { color: roleFilter === role ? '#FFF' : theme.text }]}>
                  {role.replace('_', ' ')}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <FlatList
          data={filteredUsers}
          keyExtractor={item => item.id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => loadAdminLogs(true)} tintColor={theme.primary} />
          }
          renderItem={({ item }) => {
            const isPremium = item.subscriptionTier !== 'None';
            return (
              <View style={[styles.userCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <View style={styles.flexRowAlign}>
                      <Text style={[styles.userName, { color: theme.text }]}>{item.name}</Text>
                      {item.isBlocked && (
                        <View style={[styles.badge, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
                          <Text style={[styles.badgeText, { color: theme.accentRed }]}>Blocked</Text>
                        </View>
                      )}
                    </View>
                    <Text style={[styles.userEmail, { color: theme.textMuted }]}>{item.email}</Text>
                  </View>
                  <TouchableOpacity onPress={() => openEditUserModal(item)}>
                    <View style={[styles.actionBtn, { borderColor: theme.primary }]}>
                      <Text style={[styles.actionBtnText, { color: theme.primary }]}>Modify</Text>
                    </View>
                  </TouchableOpacity>
                </View>
                <View style={styles.cardStatsRow}>
                  <View style={styles.flexRowAlign}>
                    <Coins size={14} color="#D97706" style={{ marginRight: 4 }} />
                    <Text style={[styles.statValue, { color: theme.text }]}>{item.coins ?? 0} coins</Text>
                  </View>
                  <View style={styles.flexRowAlign}>
                    <Shield size={14} color={isPremium ? theme.accentGreen : theme.textMuted} style={{ marginRight: 4 }} />
                    <Text style={[styles.statValue, { color: isPremium ? theme.accentGreen : theme.textMuted }]}>
                      {item.subscriptionTier || 'None'}
                    </Text>
                  </View>
                  <Text style={[styles.statValue, { color: theme.textMuted }]}>
                    Role: {item.role}
                  </Text>
                </View>
                <View style={styles.cardFooter}>
                  <Text style={[styles.candidateText, { color: theme.textMuted }]}>
                    CC: {item.candidateCode || 'N/A'}
                  </Text>
                  {item.lastSeen && (
                    <Text style={[styles.candidateText, { color: theme.textMuted }]}>
                      Seen: {new Date(item.lastSeen).toLocaleDateString()}
                    </Text>
                  )}
                </View>
              </View>
            );
          }}
          contentContainerStyle={styles.listPadding}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Users color={theme.textMuted} size={48} />
              <Text style={[styles.emptyText, { color: theme.textMuted }]}>No users found.</Text>
            </View>
          }
        />
      </View>
    );
  };

  // 2. Support Conversations view
  const renderSupportView = () => {
    return (
      <FlatList
        data={supportConversations}
        keyExtractor={item => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => loadAdminLogs(true)} tintColor={theme.primary} />
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.userCard, { backgroundColor: theme.card, borderColor: theme.border }]}
            onPress={() => onOpenSupportChat(item)}
          >
            <View style={styles.cardHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.userName, { color: theme.text }]}>{item.name}</Text>
                <Text style={[styles.userEmail, { color: theme.textMuted }]}>{item.email}</Text>
              </View>
              {item.unseenCount > 0 && (
                <View style={[styles.unseenBadge, { backgroundColor: theme.primary }]}>
                  <Text style={styles.unseenBadgeText}>{item.unseenCount}</Text>
                </View>
              )}
            </View>
            {item.lastMessage && (
              <View style={[styles.secondaryBox, { backgroundColor: theme.inputBg }]}>
                <Text style={[styles.secondaryBoxText, { color: theme.text }]} numberOfLines={1}>
                  {item.lastMessage.sender === 'STUDENT' ? 'Student: ' : 'Admin: '}
                  {item.lastMessage.message}
                </Text>
              </View>
            )}
            <View style={styles.cardFooter}>
              <Text style={[styles.candidateText, { color: theme.textMuted }]}>
                CC: {item.candidateCode || 'N/A'}
              </Text>
              <View style={styles.flexRowAlign}>
                <Text style={[styles.linkText, { color: theme.primary }]}>Open Chat</Text>
                <ChevronRight size={14} color={theme.primary} />
              </View>
            </View>
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.listPadding}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MessageSquare color={theme.textMuted} size={48} />
            <Text style={[styles.emptyText, { color: theme.textMuted }]}>No support threads.</Text>
          </View>
        }
      />
    );
  };

  // 3. Reported Questions view
  const renderReportsView = () => {
    return (
      <FlatList
        data={reportedQs}
        keyExtractor={item => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => loadAdminLogs(true)} tintColor={theme.primary} />
        }
        renderItem={({ item }) => (
          <View style={[styles.userCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.cardHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.userName, { color: theme.text, fontSize: 14 }]}>
                  Test: {item.mockTestTitle || 'Mock Test'}
                </Text>
                <Text style={[styles.userEmail, { color: theme.textMuted }]}>
                  By candidate CC: {item.candidateCode || 'Guest'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => handleResolveReport(item.id)}>
                <View style={[styles.actionBtn, { borderColor: theme.accentGreen }]}>
                  <Text style={[styles.actionBtnText, { color: theme.accentGreen }]}>Resolve</Text>
                </View>
              </TouchableOpacity>
            </View>

            <View style={[styles.secondaryBox, { backgroundColor: theme.inputBg }]}>
              <Text style={[styles.secondaryBoxText, { color: theme.text, fontWeight: 'bold' }]}>
                Question: {item.questionText || 'See question ID'}
              </Text>
              <Text style={[styles.secondaryBoxText, { color: theme.accentRed, marginTop: 4 }]}>
                Issue: {item.message}
              </Text>
            </View>

            <View style={styles.cardFooter}>
              <Text style={[styles.candidateText, { color: theme.textMuted }]}>
                Reported ID: {item.questionId.substring(0, 8)}...
              </Text>
              <Text style={[styles.candidateText, { color: theme.textMuted }]}>
                Date: {new Date(item.createdAt).toLocaleDateString()}
              </Text>
            </View>
          </View>
        )}
        contentContainerStyle={styles.listPadding}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <AlertTriangle color={theme.textMuted} size={48} />
            <Text style={[styles.emptyText, { color: theme.textMuted }]}>No reported questions.</Text>
          </View>
        }
      />
    );
  };

  // 4. Feedbacks list view
  const renderFeedbackView = () => {
    return (
      <FlatList
        data={feedbacks}
        keyExtractor={item => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => loadAdminLogs(true)} tintColor={theme.primary} />
        }
        renderItem={({ item }) => (
          <View style={[styles.userCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.cardHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.userName, { color: theme.text }]}>{item.userFullName || 'Anonymous'}</Text>
                <Text style={[styles.userEmail, { color: theme.textMuted }]}>{item.userEmail || 'N/A'}</Text>
              </View>
              <TouchableOpacity onPress={() => handleDeleteFeedbackLog(item.id)}>
                <Trash2 size={16} color={theme.accentRed} />
              </TouchableOpacity>
            </View>

            <View style={styles.cardStatsRow}>
              <View style={styles.flexRowAlign}>
                <Star size={14} color="#F59E0B" fill="#F59E0B" style={{ marginRight: 4 }} />
                <Text style={[styles.statValue, { color: theme.text }]}>Platform: {item.platformRating}/5</Text>
              </View>
              <View style={styles.flexRowAlign}>
                <Star size={14} color="#FBBF24" fill="#FBBF24" style={{ marginRight: 4 }} />
                <Text style={[styles.statValue, { color: theme.text }]}>Exam content: {item.examRating}/5</Text>
              </View>
            </View>

            {item.feedbackText && (
              <View style={[styles.secondaryBox, { backgroundColor: theme.inputBg }]}>
                <Text style={[styles.secondaryBoxText, { color: theme.text }]}>"{item.feedbackText}"</Text>
              </View>
            )}

            <View style={styles.cardFooter}>
              <Text style={[styles.candidateText, { color: theme.textMuted }]}>
                Test: {item.testTitle || 'N/A'}
              </Text>
              <Text style={[styles.candidateText, { color: theme.textMuted }]}>
                Platform: {item.source || 'web'}
              </Text>
            </View>
          </View>
        )}
        contentContainerStyle={styles.listPadding}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Star color={theme.textMuted} size={48} />
            <Text style={[styles.emptyText, { color: theme.textMuted }]}>No feedbacks logged.</Text>
          </View>
        }
      />
    );
  };

  // 5. Suggestions list view
  const renderSuggestionsView = () => {
    return (
      <FlatList
        data={suggestions}
        keyExtractor={item => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => loadAdminLogs(true)} tintColor={theme.primary} />
        }
        renderItem={({ item }) => {
          const isPending = item.status === 'PENDING';
          return (
            <View style={[styles.userCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <View style={styles.flexRowAlign}>
                    <Text style={[styles.userName, { color: theme.text }]}>{item.name || 'Visitor'}</Text>
                    <View style={[styles.badge, { backgroundColor: isPending ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)' }]}>
                      <Text style={[styles.badgeText, { color: isPending ? theme.accentAmber : theme.accentGreen }]}>
                        {item.status}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.userEmail, { color: theme.textMuted }]}>{item.email || 'N/A'}</Text>
                </View>
                <View style={styles.flexRowAlign}>
                  <TouchableOpacity onPress={() => openSuggestionModal(item)} style={{ marginRight: 16 }}>
                    <Edit3 size={16} color={theme.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDeleteSuggestionLog(item.id)}>
                    <Trash2 size={16} color={theme.accentRed} />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={[styles.secondaryBox, { backgroundColor: theme.inputBg }]}>
                <Text style={[styles.secondaryBoxText, { color: theme.text, fontWeight: '600' }]}>
                  Category: {item.category}
                </Text>
                <Text style={[styles.secondaryBoxText, { color: theme.text, marginTop: 4 }]}>
                  "{item.message}"
                </Text>
                {item.adminReply && (
                  <View style={[styles.replyBox, { borderLeftColor: theme.primary }]}>
                    <Text style={[styles.replyTitle, { color: theme.primary }]}>Admin Reply:</Text>
                    <Text style={[styles.replyText, { color: theme.text }]}>{item.adminReply}</Text>
                  </View>
                )}
              </View>

              <View style={styles.cardFooter}>
                <Text style={[styles.candidateText, { color: theme.textMuted }]}>
                  Source: {item.source || 'web'}
                </Text>
                <Text style={[styles.candidateText, { color: theme.textMuted }]}>
                  Date: {new Date(item.createdAt).toLocaleDateString()}
                </Text>
              </View>
            </View>
          );
        }}
        contentContainerStyle={styles.listPadding}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <FileText color={theme.textMuted} size={48} />
            <Text style={[styles.emptyText, { color: theme.textMuted }]}>No suggestions logged.</Text>
          </View>
        }
      />
    );
  };

  // 6. Attempts list view
  const renderAttemptsView = () => {
    return (
      <FlatList
        data={attempts}
        keyExtractor={item => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => loadAdminLogs(true)} tintColor={theme.primary} />
        }
        renderItem={({ item }) => {
          const userName = item.user?.fullName || 'Student';
          const testTitle = item.mockTest?.title || 'Mock Test';
          return (
            <View style={[styles.userCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.userName, { color: theme.text }]}>{userName}</Text>
                  <Text style={[styles.userEmail, { color: theme.textMuted }]} numberOfLines={1}>
                    Test: {testTitle}
                  </Text>
                </View>
              </View>

              <View style={styles.attemptDetailsRow}>
                <View style={styles.attemptDetailBox}>
                  <Text style={[styles.detailLabel, { color: theme.textMuted }]}>Score</Text>
                  <Text style={[styles.detailVal, { color: theme.text }]}>
                    {item.finalScore}/{item.mockTest?.maxMarks || 200}
                  </Text>
                </View>
                <View style={styles.attemptDetailBox}>
                  <Text style={[styles.detailLabel, { color: theme.textMuted }]}>Accuracy</Text>
                  <Text style={[styles.detailVal, { color: theme.text }]}>{item.accuracyPercentage ?? 0}%</Text>
                </View>
                <View style={styles.attemptDetailBox}>
                  <Text style={[styles.detailLabel, { color: theme.textMuted }]}>Duration</Text>
                  <Text style={[styles.detailVal, { color: theme.text }]}>
                    {Math.floor((item.timeSpentSeconds ?? 0) / 60)}m {((item.timeSpentSeconds ?? 0) % 60)}s
                  </Text>
                </View>
                <View style={styles.attemptDetailBox}>
                  <Text style={[styles.detailLabel, { color: theme.textMuted }]}>Warnings</Text>
                  <Text style={[styles.detailVal, { color: item.violationsCount > 0 ? theme.accentRed : theme.text }]}>
                    {item.violationsCount ?? 0}
                  </Text>
                </View>
              </View>

              <View style={styles.cardFooter}>
                <Text style={[styles.candidateText, { color: theme.textMuted }]}>
                  Platform: {item.source || 'web'} | CC: {item.user?.candidateCode || 'N/A'}
                </Text>
                <Text style={[styles.candidateText, { color: theme.textMuted }]}>
                  Date: {item.startedAt ? `${new Date(item.startedAt).toLocaleDateString()} ${new Date(item.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'N/A'}
                </Text>
              </View>
            </View>
          );
        }}
        contentContainerStyle={styles.listPadding}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Calendar color={theme.textMuted} size={48} />
            <Text style={[styles.emptyText, { color: theme.textMuted }]}>No attempts registered.</Text>
          </View>
        }
      />
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.headerBg, borderBottomColor: theme.border, height: 56 + insets.top, paddingTop: insets.top }]}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <ArrowLeft color={theme.headerText} size={24} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={[styles.headerTitle, { color: theme.headerText }]}>Admin Control Suite</Text>
          <Text style={styles.headerSubtitle}>System administration terminal</Text>
        </View>
        <View style={styles.flexRowAlign}>
          <TouchableOpacity onPress={onOpenAnalytics} style={[styles.headerIconBtn, { marginRight: 16 }]}>
            <BarChart2 color={theme.headerText} size={20} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => loadAdminLogs(false)} style={styles.headerIconBtn}>
            <RefreshCw color={theme.headerText} size={18} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Tab bar */}
      {renderTabHeader()}

      {/* Loader or Content */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.textMuted }]}>Ingesting logs...</Text>
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          {activeTab === 'users' && renderUsersView()}
          {activeTab === 'support' && renderSupportView()}
          {activeTab === 'reports' && renderReportsView()}
          {activeTab === 'feedback' && renderFeedbackView()}
          {activeTab === 'suggestions' && renderSuggestionsView()}
          {activeTab === 'attempts' && renderAttemptsView()}
        </View>
      )}

      {/* Modify User modal */}
      <Modal
        visible={editUserModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setEditUserModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Modify User Privileges</Text>
            {selectedUser && (
              <View style={{ width: '100%' }}>
                <Text style={[styles.modalUserDesc, { color: theme.textMuted, marginBottom: 12 }]}>
                  {selectedUser.name} ({selectedUser.email})
                </Text>

                <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
                  {/* Role */}
                  <Text style={[styles.inputLabel, { color: theme.textMuted }]}>Access Role</Text>
                  <View style={styles.pickerRow}>
                    {['STUDENT', 'ADMIN', 'SUPPORT_TEAM', 'NOTICES_MANAGER'].map((r) => (
                      <TouchableOpacity
                        key={r}
                        onPress={() => setEditRole(r)}
                        style={[
                          styles.pickerBadge,
                          { backgroundColor: editRole === r ? theme.primary : theme.inputBg, borderColor: theme.border }
                        ]}
                      >
                        <Text style={[styles.pickerBadgeText, { color: editRole === r ? '#FFF' : theme.text }]}>
                          {r.replace('_', ' ')}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Subscription pass tier */}
                  <Text style={[styles.inputLabel, { color: theme.textMuted }]}>Subscription Pass Tier</Text>
                  <View style={styles.pickerRow}>
                    {['None', 'Testbook Pass', 'Testbook Pass Pro'].map((t) => (
                      <TouchableOpacity
                        key={t}
                        onPress={() => setEditTier(t)}
                        style={[
                          styles.pickerBadge,
                          { backgroundColor: editTier === t ? theme.primary : theme.inputBg, borderColor: theme.border }
                        ]}
                      >
                        <Text style={[styles.pickerBadgeText, { color: editTier === t ? '#FFF' : theme.text }]}>
                          {t}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Coins */}
                  <Text style={[styles.inputLabel, { color: theme.textMuted }]}>Coins Balance</Text>
                  <View style={[styles.modalInputBox, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder }]}>
                    <TextInput
                      style={[styles.modalInput, { color: theme.text }]}
                      keyboardType="number-pad"
                      value={editCoins}
                      onChangeText={setEditCoins}
                    />
                  </View>

                  {/* Pass Purchased Date */}
                  <Text style={[styles.inputLabel, { color: theme.textMuted }]}>Pass Purchased Date (YYYY-MM-DD)</Text>
                  <View style={[styles.modalInputBox, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder }]}>
                    <TextInput
                      style={[styles.modalInput, { color: theme.text }]}
                      placeholder="YYYY-MM-DD (e.g. 2026-07-23)"
                      placeholderTextColor={theme.textMuted}
                      value={editPurchasedAt}
                      onChangeText={setEditPurchasedAt}
                    />
                  </View>

                  {/* Pass Expiry Date */}
                  <Text style={[styles.inputLabel, { color: theme.textMuted }]}>Pass Expiry Date (YYYY-MM-DD)</Text>
                  <View style={[styles.modalInputBox, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder }]}>
                    <TextInput
                      style={[styles.modalInput, { color: theme.text }]}
                      placeholder="YYYY-MM-DD (e.g. 2027-07-23)"
                      placeholderTextColor={theme.textMuted}
                      value={editExpiresAt}
                      onChangeText={setEditExpiresAt}
                    />
                  </View>

                  {/* Block switch */}
                  <View style={styles.switchRow}>
                    <Text style={[styles.switchLabel, { color: theme.text }]}>Block Account Access</Text>
                    <Switch
                      value={editBlocked}
                      onValueChange={setEditBlocked}
                      trackColor={{ false: '#767577', true: theme.accentRed }}
                      thumbColor={editBlocked ? theme.accentRed : '#f4f3f4'}
                    />
                  </View>
                </ScrollView>

                {/* Modal Buttons */}
                <View style={[styles.modalActionRow, { marginTop: 12 }]}>
                  <TouchableOpacity
                    onPress={() => setEditUserModalVisible(false)}
                    style={[styles.modalBtn, styles.modalBtnCancel, { borderColor: theme.border }]}
                  >
                    <Text style={[styles.modalBtnText, { color: theme.text }]}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleSaveUser}
                    style={[styles.modalBtn, { backgroundColor: theme.primary }]}
                    disabled={updatingUser}
                  >
                    {updatingUser ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={[styles.modalBtnText, { color: '#FFF' }]}>Apply Changes</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Modify Suggestion Modal */}
      <Modal
        visible={suggestionModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setSuggestionModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Review Suggestion Log</Text>
            {selectedSuggestion && (
              <View style={{ width: '100%' }}>
                <Text style={[styles.modalUserDesc, { color: theme.textMuted }]}>
                  From: {selectedSuggestion.name} | Category: {selectedSuggestion.category}
                </Text>

                {/* Status Segment */}
                <Text style={[styles.inputLabel, { color: theme.textMuted }]}>Resolution Status</Text>
                <View style={styles.pickerRow}>
                  {['PENDING', 'APPROVED', 'REJECTED'].map((st) => (
                    <TouchableOpacity
                      key={st}
                      onPress={() => setSuggStatus(st)}
                      style={[
                        styles.pickerBadge,
                        { backgroundColor: suggStatus === st ? theme.primary : theme.inputBg, borderColor: theme.border }
                      ]}
                    >
                      <Text style={[styles.pickerBadgeText, { color: suggStatus === st ? '#FFF' : theme.text }]}>
                        {st}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Reply Input */}
                <Text style={[styles.inputLabel, { color: theme.textMuted }]}>Admin Reply Response</Text>
                <TextInput
                  style={[
                    styles.modalInputTextarea,
                    {
                      backgroundColor: theme.inputBg,
                      borderColor: theme.inputBorder,
                      color: theme.text
                    }
                  ]}
                  multiline
                  numberOfLines={4}
                  placeholder="Enter response reply..."
                  placeholderTextColor={theme.textMuted}
                  value={suggReply}
                  onChangeText={setSuggReply}
                />

                {/* Modal Buttons */}
                <View style={styles.modalActionRow}>
                  <TouchableOpacity
                    onPress={() => setSuggestionModalVisible(false)}
                    style={[styles.modalBtn, styles.modalBtnCancel, { borderColor: theme.border }]}
                  >
                    <Text style={[styles.modalBtnText, { color: theme.text }]}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleSaveSuggestion}
                    style={[styles.modalBtn, { backgroundColor: theme.primary }]}
                    disabled={updatingSugg}
                  >
                    {updatingSugg ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={[styles.modalBtnText, { color: '#FFF' }]}>Save Reply</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  backBtn: {
    padding: 4,
  },
  headerTitleContainer: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#94A3B8',
  },
  headerIconBtn: {
    padding: 6,
  },
  tabBar: {
    borderBottomWidth: 1,
  },
  tabScroll: {
    paddingHorizontal: 12,
  },
  tabItem: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTabItem: {
    borderBottomWidth: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  tabViewContainer: {
    flex: 1,
  },
  searchContainer: {
    padding: 12,
    borderBottomWidth: 1,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    height: '100%',
  },
  filterScroll: {
    paddingVertical: 4,
  },
  filterBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    marginRight: 8,
  },
  filterBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  listPadding: {
    padding: 16,
    paddingBottom: 32,
  },
  userCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  flexRowAlign: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 8,
  },
  userEmail: {
    fontSize: 13,
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  actionBtn: {
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  cardStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(148, 163, 184, 0.15)',
    marginVertical: 4,
  },
  statValue: {
    fontSize: 12,
    fontWeight: '600',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  candidateText: {
    fontSize: 11,
  },
  unseenBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unseenBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  secondaryBox: {
    borderRadius: 8,
    padding: 10,
    marginVertical: 8,
  },
  secondaryBoxText: {
    fontSize: 13,
    lineHeight: 18,
  },
  replyBox: {
    marginTop: 8,
    borderLeftWidth: 3,
    paddingLeft: 8,
  },
  replyTitle: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  replyText: {
    fontSize: 12,
    marginTop: 2,
  },
  linkText: {
    fontSize: 12,
    fontWeight: '700',
    marginRight: 2,
  },
  attemptDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 10,
  },
  attemptDetailBox: {
    alignItems: 'center',
    flex: 1,
  },
  detailLabel: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  detailVal: {
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 2,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 12,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  modalUserDesc: {
    fontSize: 13,
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  pickerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  pickerBadge: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginRight: 8,
    marginBottom: 8,
  },
  pickerBadgeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  modalInputBox: {
    height: 48,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    justifyContent: 'center',
    marginBottom: 20,
  },
  modalInput: {
    fontSize: 15,
    height: '100%',
  },
  modalInputTextarea: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    height: 100,
    textAlignVertical: 'top',
    marginBottom: 20,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  switchLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  modalActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalBtn: {
    flex: 1,
    height: 48,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  modalBtnCancel: {
    borderWidth: 1,
    marginLeft: 0,
    marginRight: 8,
  },
  modalBtnText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
});
