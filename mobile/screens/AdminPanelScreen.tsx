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
  Platform
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
  MapPin
} from 'lucide-react-native';
import { ApiClient } from '../api';
import { ThemeColors } from '../theme';

interface AdminPanelScreenProps {
  currentUser: any;
  onBack: () => void;
  isDark?: boolean;
  onOpenSupportChat: (studentUser: any) => void;
}

type TabType = 'users' | 'support' | 'reports' | 'feedback' | 'suggestions' | 'attempts';

export default function AdminPanelScreen({
  currentUser,
  onBack,
  isDark = false,
  onOpenSupportChat
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

  // Modal actions
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [editUserModalVisible, setEditUserModalVisible] = useState(false);
  const [editTier, setEditTier] = useState('None');
  const [editCoins, setEditCoins] = useState('0');
  const [editBlocked, setEditBlocked] = useState(false);
  const [editRole, setEditRole] = useState('STUDENT');
  const [updatingUser, setUpdatingUser] = useState(false);

  // Suggestion Modal actions
  const [selectedSuggestion, setSelectedSuggestion] = useState<any | null>(null);
  const [suggestionModalVisible, setSuggestionModalVisible] = useState(false);
  const [suggStatus, setSuggStatus] = useState('PENDING');
  const [suggReply, setSuggReply] = useState('');
  const [updatingSugg, setUpdatingSugg] = useState(false);

  // Load all logs from the backend
  const loadAdminLogs = async (silent = false) => {
    if (!silent) setLoading(true);
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
      console.warn("Failed to fetch admin data logs:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAdminLogs();
  }, []);

  // Modify User profile
  const openEditUserModal = (user: any) => {
    setSelectedUser(user);
    setEditTier(user.subscriptionTier || 'None');
    setEditCoins(String(user.coins ?? 0));
    setEditBlocked(user.isBlocked ?? false);
    setEditRole(user.role || 'STUDENT');
    setEditUserModalVisible(true);
  };

  const handleSaveUser = async () => {
    if (!selectedUser) return;
    setUpdatingUser(true);
    try {
      const parsedCoins = parseInt(editCoins) || 0;
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
        purchasedAt: selectedUser.subscriptionPurchasedAt || null,
        expiry: selectedUser.subscriptionExpiresAt || null,
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
              ? { ...u, role: editRole, subscriptionTier: editTier, coins: parsedCoins, isBlocked: editBlocked }
              : u
          )
        );
        Alert.alert('Success', 'User profile details ingested.');
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
        Alert.alert('Success', 'Suggestion status updated.');
      } else {
        Alert.alert('Error', res.error || 'Failed to update suggestion status');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Operation failed');
    } finally {
      setUpdatingSugg(false);
    }
  };

  const handleDeleteSuggestionLog = async (id: string) => {
    Alert.alert('Delete Suggestion', 'Are you sure you want to delete this suggestion log permanently?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setUpdatingSugg(true);
          const res = await ApiClient.deleteSuggestion(id);
          if (res.success) {
            setSuggestionModalVisible(false);
            setSuggestions(prev => prev.filter(s => s.id !== id));
            Alert.alert('Success', 'Suggestion deleted successfully.');
          } else {
            Alert.alert('Error', res.error || 'Failed to delete suggestion');
          }
          setUpdatingSugg(false);
        }
      }
    ]);
  };

  // Delete Feedback
  const handleDeleteFeedbackLog = async (id: string) => {
    Alert.alert('Delete Feedback', 'Are you sure you want to delete this feedback log entry?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const res = await ApiClient.deleteFeedback(id);
          if (res.success) {
            setFeedbacks(prev => prev.filter(f => f.id !== id));
            Alert.alert('Success', 'Feedback deleted.');
          } else {
            Alert.alert('Error', res.error || 'Failed to delete feedback entry');
          }
        }
      }
    ]);
  };

  // Resolve Reported Question
  const handleResolveReport = async (id: string) => {
    Alert.alert('Resolve Flag', 'Mark this question report as resolved and delete the log?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Resolve',
        style: 'destructive',
        onPress: async () => {
          const res = await ApiClient.deleteReportedQuestion(id);
          if (res.success) {
            setReportedQs(prev => prev.filter(r => r.id !== id));
            Alert.alert('Success', 'Question report log cleared.');
          } else {
            Alert.alert('Error', res.error || 'Failed to delete reported log');
          }
        }
      }
    ]);
  };


  // Filter segment rules for users list
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
      { id: 'attempts', label: 'Attempt Logs' }
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
        {/* Search & Filter segment bar */}
        <View style={[styles.searchContainer, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
          <View style={[styles.searchBox, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder }]}>
            <Search size={18} color={theme.textMuted} style={{ marginRight: 8 }} />
            <TextInput
              style={[styles.searchInput, { color: theme.text }]}
              placeholder="Search by name, email, CC, mobile..."
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
          renderItem={({ item }) => {
            const isPremium = item.subscriptionTier !== 'None';
            return (
              <View style={[styles.userCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <View style={styles.flexRowAlign}>
                      <Text style={[styles.userName, { color: theme.text }]}>{item.name}</Text>
                      {item.isBlocked && (
                        <View style={[styles.badge, { backgroundColor: '#FEE2E2' }]}>
                          <Text style={[styles.badgeText, { color: '#EF4444' }]}>Blocked</Text>
                        </View>
                      )}
                    </View>
                    <Text style={[styles.userEmail, { color: theme.textMuted }]}>{item.email}</Text>
                  </View>
                  <TouchableOpacity onPress={() => openEditUserModal(item)}>
                    <View style={[styles.actionBtn, { borderColor: theme.border }]}>
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
                    <Shield size={14} color={isPremium ? '#10B981' : theme.textMuted} style={{ marginRight: 4 }} />
                    <Text style={[styles.statValue, { color: isPremium ? '#10B981' : theme.textMuted }]}>
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
                      Last seen: {new Date(item.lastSeen).toLocaleDateString()}
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
              <Text style={[styles.emptyText, { color: theme.textMuted, marginTop: 12 }]}>
                No users found.
              </Text>
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
                <View style={styles.unseenBadge}>
                  <Text style={styles.unseenBadgeText}>{item.unseenCount}</Text>
                </View>
              )}
            </View>
            {item.lastMessage && (
              <View style={styles.secondaryBox}>
                <Text style={[styles.secondaryBoxText, { color: theme.text }]} numberOfLines={1}>
                  {item.lastMessage.sender === 'STUDENT' ? 'Student: ' : 'Admin: '}
                  {item.lastMessage.message}
                </Text>
                <Text style={[styles.secondaryBoxTime, { color: theme.textMuted }]}>
                  {new Date(item.lastMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            )}
            <View style={styles.cardFooter}>
              <Text style={[styles.candidateText, { color: theme.textMuted }]}>
                CC: {item.candidateCode || 'N/A'}
              </Text>
              <View style={styles.flexRowAlign}>
                <Text style={[styles.linkText, { color: theme.primary }]}>Reply Message</Text>
                <ChevronRight size={14} color={theme.primary} />
              </View>
            </View>
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.listPadding}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MessageSquare color={theme.textMuted} size={48} />
            <Text style={[styles.emptyText, { color: theme.textMuted, marginTop: 12 }]}>
              No support conversations threads.
            </Text>
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
        renderItem={({ item }) => (
          <View style={[styles.userCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.cardHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.userName, { color: theme.text, fontSize: 13 }]}>
                  Test: {item.mockTestTitle || 'Mock Test'}
                </Text>
                <Text style={[styles.userEmail, { color: theme.textMuted, fontSize: 11 }]}>
                  Question ID: {item.questionId}
                </Text>
              </View>
              <TouchableOpacity onPress={() => handleResolveReport(item.id)}>
                <View style={styles.badgeBtnDanger}>
                  <Text style={styles.badgeBtnDangerText}>Resolve</Text>
                </View>
              </TouchableOpacity>
            </View>
            <View style={styles.secondaryBox}>
              <Text style={[styles.boxLabel, { color: theme.text }]}>Flagged Question:</Text>
              <Text style={[styles.boxText, { color: theme.textMuted }]}>{item.questionText || 'No question text'}</Text>
              <Text style={[styles.boxLabel, { color: theme.text, marginTop: 6 }]}>Student Report:</Text>
              <Text style={[styles.boxText, { color: '#EF4444' }]}>"{item.message}"</Text>
            </View>
            <View style={styles.cardFooter}>
              <Text style={[styles.candidateText, { color: theme.textMuted }]}>
                Student CC: {item.candidateCode || 'N/A'}
              </Text>
              <Text style={[styles.candidateText, { color: theme.textMuted }]}>
                Logged: {item.createdAt}
              </Text>
            </View>
          </View>
        )}
        contentContainerStyle={styles.listPadding}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <AlertTriangle color={theme.textMuted} size={48} />
            <Text style={[styles.emptyText, { color: theme.textMuted, marginTop: 12 }]}>
              No questions reported yet.
            </Text>
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
        renderItem={({ item }) => (
          <View style={[styles.userCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.cardHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.userName, { color: theme.text }]}>{item.userFullName || 'Student User'}</Text>
                <Text style={[styles.userEmail, { color: theme.textMuted }]}>{item.userEmail || 'No email'}</Text>
              </View>
              <TouchableOpacity onPress={() => handleDeleteFeedbackLog(item.id)}>
                <Trash2 size={18} color="#EF4444" />
              </TouchableOpacity>
            </View>
            <View style={styles.ratingRow}>
              <View style={styles.ratingBox}>
                <Text style={[styles.ratingLabel, { color: theme.textMuted }]}>App Rating:</Text>
                <View style={styles.starsContainer}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      size={12}
                      color={star <= (item.platformRating ?? 0) ? '#F59E0B' : '#CBD5E1'}
                      fill={star <= (item.platformRating ?? 0) ? '#F59E0B' : 'transparent'}
                    />
                  ))}
                  <Text style={[styles.ratingValText, { color: theme.text }]}> {item.platformRating ?? 0}/5</Text>
                </View>
              </View>
              <View style={styles.ratingBox}>
                <Text style={[styles.ratingLabel, { color: theme.textMuted }]}>Exam Rating:</Text>
                <View style={styles.starsContainer}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      size={12}
                      color={star <= (item.examRating ?? 0) ? '#EC4899' : '#CBD5E1'}
                      fill={star <= (item.examRating ?? 0) ? '#EC4899' : 'transparent'}
                    />
                  ))}
                  <Text style={[styles.ratingValText, { color: theme.text }]}> {item.examRating ?? 0}/5</Text>
                </View>
              </View>
            </View>
            {item.feedbackText ? (
              <View style={styles.secondaryBox}>
                <Text style={[styles.boxText, { color: theme.text }]}>"{item.feedbackText}"</Text>
              </View>
            ) : null}
            <View style={styles.cardFooter}>
              <Text style={[styles.candidateText, { color: theme.textMuted }]}>
                Platform: {item.source || 'web'}
              </Text>
              <Text style={[styles.candidateText, { color: theme.textMuted }]}>
                Date: {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'N/A'}
              </Text>
            </View>
          </View>
        )}
        contentContainerStyle={styles.listPadding}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Star color={theme.textMuted} size={48} />
            <Text style={[styles.emptyText, { color: theme.textMuted, marginTop: 12 }]}>
              No feedbacks or ratings recorded.
            </Text>
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
        renderItem={({ item }) => {
          let badgeBg = '#FEF3C7';
          let badgeColor = '#D97706';
          if (item.status === 'APPROVED') {
            badgeBg = '#D1FAE5';
            badgeColor = '#10B981';
          } else if (item.status === 'REJECTED') {
            badgeBg = '#FEE2E2';
            badgeColor = '#EF4444';
          }
          return (
            <View style={[styles.userCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.userName, { color: theme.text }]}>
                    {item.name || 'Anonymous'} ({item.email || 'No email'})
                  </Text>
                  <Text style={[styles.userEmail, { color: theme.textMuted }]}>
                    Category: {item.category || 'General'}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => openSuggestionModal(item)}>
                  <View style={[styles.badge, { backgroundColor: badgeBg }]}>
                    <Text style={[styles.badgeText, { color: badgeColor }]}>{item.status}</Text>
                  </View>
                </TouchableOpacity>
              </View>

              <View style={styles.secondaryBox}>
                <Text style={[styles.boxLabel, { color: theme.text }]}>Suggestion Message:</Text>
                <Text style={[styles.boxText, { color: theme.text }]}>"{item.message}"</Text>

                {item.adminReply ? (
                  <View style={{ marginTop: 6, borderTopWidth: 1, borderTopColor: isDark ? '#334155' : '#F1F5F9', paddingTop: 6 }}>
                    <Text style={[styles.boxLabel, { color: theme.text }]}>Admin Reply:</Text>
                    <Text style={[styles.boxText, { color: theme.primary, fontWeight: 'bold' }]}>"{item.adminReply}"</Text>
                  </View>
                ) : null}
              </View>

              <View style={styles.cardFooter}>
                <Text style={[styles.candidateText, { color: theme.textMuted }]}>
                  Source: {item.source || 'app'}
                </Text>
                <View style={styles.flexRowAlign}>
                  <TouchableOpacity onPress={() => openSuggestionModal(item)} style={{ marginRight: 16 }}>
                    <Text style={[styles.linkText, { color: theme.primary }]}>Review</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDeleteSuggestionLog(item.id)}>
                    <Trash2 size={14} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          );
        }}
        contentContainerStyle={styles.listPadding}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <FileText color={theme.textMuted} size={48} />
            <Text style={[styles.emptyText, { color: theme.textMuted, marginTop: 12 }]}>
              No suggestions in suggestion box yet.
            </Text>
          </View>
        }
      />
    );
  };

  // 6. Test Attempts logs view
  const renderAttemptsView = () => {
    return (
      <FlatList
        data={attempts}
        keyExtractor={item => item.id}
        renderItem={({ item }) => {
          const userName = item.user?.fullName || 'Student Candidate';
          const testTitle = item.mockTest?.title || 'Mock Test';
          return (
            <View style={[styles.userCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.userName, { color: theme.text }]}>{userName}</Text>
                  <Text style={[styles.userEmail, { color: theme.textMuted }]}>
                    Test: {testTitle} (CC: {item.user?.candidateCode || 'N/A'})
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
                  <Text style={[styles.detailVal, { color: item.violationsCount > 0 ? '#EF4444' : theme.text }]}>
                    {item.violationsCount ?? 0}
                  </Text>
                </View>
              </View>

              <View style={styles.cardFooter}>
                <Text style={[styles.candidateText, { color: theme.textMuted }]}>
                  Platform: {item.source || 'web'} | Status: {item.status}
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
            <Text style={[styles.emptyText, { color: theme.textMuted, marginTop: 12 }]}>
              No test attempts logged by candidates.
            </Text>
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
        <TouchableOpacity onPress={() => loadAdminLogs(false)} style={styles.refreshBtn}>
          <RefreshCw color={theme.headerText} size={18} />
        </TouchableOpacity>
      </View>

      {/* Dynamic scrolling tab bar */}
      {renderTabHeader()}

      {/* View router */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.textMuted }]}>Ingesting administration logs...</Text>
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
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Modify User Privileges</Text>
            {selectedUser && (
              <View style={{ width: '100%' }}>
                <Text style={[styles.modalUserDesc, { color: theme.text }]}>
                  {selectedUser.name} ({selectedUser.email})
                </Text>

                {/* Role selection */}
                <Text style={[styles.inputLabel, { color: theme.textMuted }]}>Access Role</Text>
                <View style={styles.pickerRow}>
                  {['STUDENT', 'ADMIN', 'SUPPORT_TEAM', 'NOTICES_MANAGER'].map((r) => (
                    <TouchableOpacity
                      key={r}
                      onPress={() => setEditRole(r)}
                      style={[
                        styles.pickerBadge,
                        editRole === r ? { backgroundColor: theme.primary } : { backgroundColor: theme.inputBg, borderColor: theme.border }
                      ]}
                    >
                      <Text style={[styles.pickerBadgeText, editRole === r ? { color: '#FFF' } : { color: theme.text }]}>
                        {r.replace('_', ' ')}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Pass Tier Selection */}
                <Text style={[styles.inputLabel, { color: theme.textMuted }]}>Subscription Pass Tier</Text>
                <View style={styles.pickerRow}>
                  {['None', 'Testbook Pass', 'Testbook Pass Pro'].map((t) => (
                    <TouchableOpacity
                      key={t}
                      onPress={() => setEditTier(t)}
                      style={[
                        styles.pickerBadge,
                        editTier === t ? { backgroundColor: theme.primary } : { backgroundColor: theme.inputBg, borderColor: theme.border }
                      ]}
                    >
                      <Text style={[styles.pickerBadgeText, editTier === t ? { color: '#FFF' } : { color: theme.text }]}>
                        {t}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Coins Text Input */}
                <Text style={[styles.inputLabel, { color: theme.textMuted }]}>User Coins Balance</Text>
                <View style={[styles.modalInputBox, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder }]}>
                  <TextInput
                    style={[styles.modalInput, { color: theme.text }]}
                    keyboardType="number-pad"
                    value={editCoins}
                    onChangeText={setEditCoins}
                  />
                </View>

                {/* Block Switch */}
                <View style={styles.switchRow}>
                  <Text style={[styles.switchLabel, { color: theme.text }]}>Block Account Access</Text>
                  <Switch
                    value={editBlocked}
                    onValueChange={setEditBlocked}
                    trackColor={{ false: '#767577', true: '#EF4444' }}
                    thumbColor={editBlocked ? '#F43F5E' : '#f4f3f4'}
                  />
                </View>

                {/* Modal Buttons */}
                <View style={styles.modalActionRow}>
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
                      <Text style={[styles.modalBtnText, { color: '#FFF' }]}>Ingest Changes</Text>
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
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Review Suggestion Box Log</Text>
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
                        suggStatus === st ? { backgroundColor: theme.primary } : { backgroundColor: theme.inputBg, borderColor: theme.border }
                      ]}
                    >
                      <Text style={[styles.pickerBadgeText, suggStatus === st ? { color: '#FFF' } : { color: theme.text }]}>
                        {st}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Reply Input */}
                <Text style={[styles.inputLabel, { color: theme.textMuted }]}>Admin Response Reply</Text>
                <TextInput
                  style={[
                    styles.modalInput,
                    {
                      backgroundColor: theme.inputBg,
                      borderColor: theme.inputBorder,
                      borderWidth: 1,
                      borderRadius: 8,
                      padding: 12,
                      minHeight: 80,
                      color: theme.text,
                      textAlignVertical: 'top',
                      marginBottom: 16
                    }
                  ]}
                  multiline
                  placeholder="Type administrative response reply here..."
                  placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
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
                      <Text style={[styles.modalBtnText, { color: '#FFF' }]}>Update Status</Text>
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
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  backBtn: {
    marginRight: 16,
  },
  refreshBtn: {
    marginLeft: 'auto',
    padding: 6,
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
    color: '#94A3B8',
    marginTop: 1,
  },
  tabBar: {
    borderBottomWidth: 1,
  },
  tabScroll: {
    paddingHorizontal: 8,
  },
  tabItem: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTabItem: {
    borderBottomWidth: 2,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '700',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    fontSize: 13,
    marginTop: 12,
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
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 40,
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    paddingVertical: 0,
  },
  filterScroll: {
    paddingVertical: 4,
    gap: 8,
  },
  filterBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    marginRight: 6,
  },
  filterBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  listPadding: {
    padding: 12,
    paddingBottom: 32,
  },
  userCard: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  userName: {
    fontSize: 13,
    fontWeight: 'bold',
    marginRight: 8,
  },
  userEmail: {
    fontSize: 11,
    marginTop: 1,
  },
  flexRowAlign: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: 'bold',
  },
  actionBtn: {
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  actionBtnText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  cardStatsRow: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 16,
  },
  statValue: {
    fontSize: 11,
    fontWeight: '600',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(148, 163, 184, 0.1)',
    paddingTop: 8,
    alignItems: 'center',
  },
  candidateText: {
    fontSize: 10,
  },
  linkText: {
    fontSize: 11,
    fontWeight: 'bold',
    marginRight: 2,
  },
  unseenBadge: {
    backgroundColor: '#EF4444',
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  unseenBadgeText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: 'bold',
  },
  secondaryBox: {
    backgroundColor: 'rgba(148, 163, 184, 0.05)',
    padding: 8,
    borderRadius: 6,
    marginTop: 8,
  },
  secondaryBoxText: {
    fontSize: 11,
    flex: 1,
    marginRight: 8,
  },
  secondaryBoxTime: {
    fontSize: 9,
    marginTop: 2,
    alignSelf: 'flex-end',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 32,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 12,
  },
  badgeBtnDanger: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeBtnDangerText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  boxLabel: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  boxText: {
    fontSize: 11,
    lineHeight: 16,
    marginTop: 2,
  },
  ratingRow: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 16,
  },
  ratingBox: {
    flex: 1,
  },
  ratingLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  starsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingValText: {
    fontSize: 10,
    fontWeight: 'bold',
    marginLeft: 2,
  },
  attemptDetailsRow: {
    flexDirection: 'row',
    marginTop: 10,
    backgroundColor: 'rgba(148, 163, 184, 0.05)',
    padding: 10,
    borderRadius: 8,
    gap: 8,
  },
  attemptDetailBox: {
    flex: 1,
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 9,
    fontWeight: 'bold',
  },
  detailVal: {
    fontSize: 11,
    fontWeight: 'bold',
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  modalUserDesc: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 12,
    marginBottom: 6,
  },
  pickerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 6,
  },
  pickerBadge: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  pickerBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  modalInputBox: {
    borderWidth: 1,
    borderRadius: 8,
    height: 44,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  modalInput: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  switchLabel: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  modalActionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  modalBtn: {
    flex: 1,
    height: 44,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBtnCancel: {
    borderWidth: 1,
  },
  modalBtnText: {
    fontSize: 13,
    fontWeight: 'bold',
  },
});
