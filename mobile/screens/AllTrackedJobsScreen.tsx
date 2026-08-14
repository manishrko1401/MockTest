import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  StyleSheet,
  StatusBar,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Bookmark,
  CheckCircle2,
  ChevronRight,
  Clock,
  ExternalLink,
  Search,
  Trash2,
  X,
  FileText,
  Calendar,
} from 'lucide-react-native';
import { ApiClient } from '../api';

interface AllTrackedJobsScreenProps {
  currentUser: any;
  notices: any[];
  onBack: () => void;
  onOpenNotice: (notice: any) => void;
  onRefreshUser?: (userId: string) => Promise<void>;
  isDark?: boolean;
  language: 'en' | 'hi';
}

export default function AllTrackedJobsScreen({
  currentUser,
  notices,
  onBack,
  onOpenNotice,
  onRefreshUser,
  isDark = false,
  language,
}: AllTrackedJobsScreenProps) {
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<'all' | 'applied' | 'saved'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [jobToRemove, setJobToRemove] = useState<{ noticeId: string; title: string } | null>(null);
  const [isRemovingJob, setIsRemovingJob] = useState(false);

  const trackedList: any[] = currentUser?.trackedJobs || [];
  const appliedCount = trackedList.filter((j: any) => j.isApplied).length;
  const savedCount = trackedList.filter((j: any) => j.isSaved).length;

  const filteredJobs = useMemo(() => {
    return trackedList.filter((job: any) => {
      // 1. Category Filter
      if (filter === 'applied' && !job.isApplied) return false;
      if (filter === 'saved' && !job.isSaved) return false;

      // 2. Search Query Filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const titleMatch = (job.title || '').toLowerCase().includes(q);
        const appNoMatch = (job.applicationNo || '').toLowerCase().includes(q);
        return titleMatch || appNoMatch;
      }
      return true;
    });
  }, [trackedList, filter, searchQuery]);

  const handleConfirmRemoveJob = async () => {
    if (!jobToRemove || !currentUser?.id || isRemovingJob) return;
    setIsRemovingJob(true);
    try {
      const updatedList = trackedList.filter((j: any) => j.noticeId !== jobToRemove.noticeId);
      await ApiClient.updateTrackedJobs(currentUser.id, updatedList);
      if (onRefreshUser) await onRefreshUser(currentUser.id);
      setJobToRemove(null);
    } catch (err) {
      console.error('Remove tracked job error:', err);
      Alert.alert('Error', language === 'hi' ? 'जॉब हटाने में त्रुटि हुई।' : 'Failed to remove job from tracker.');
    } finally {
      setIsRemovingJob(false);
    }
  };

  const bgColor = isDark ? '#0B0F19' : '#F8FAFC';
  const cardBg = isDark ? '#111827' : '#FFFFFF';
  const itemBg = isDark ? '#1E293B' : '#FFFFFF';
  const textColor = isDark ? '#F3F4F6' : '#1E293B';
  const mutedTextColor = isDark ? '#9CA3AF' : '#64748B';
  const borderColor = isDark ? '#1F2937' : '#E2E8F0';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]} edges={['top', 'left', 'right', 'bottom']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* TOP NAVBAR */}
      <View style={[styles.navbar, { backgroundColor: cardBg, borderBottomColor: borderColor }]}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.7}>
          <ArrowLeft size={20} color={textColor} />
          <Text style={[styles.backText, { color: textColor }]}>
            {language === 'hi' ? 'वापस' : 'Back'}
          </Text>
        </TouchableOpacity>

        <Text style={[styles.navTitle, { color: textColor }]} numberOfLines={1}>
          {language === 'hi' ? 'ट्रैक किए गए सभी जॉब्स' : 'All Tracked Jobs'}
        </Text>

        <View style={[styles.countBadge, { backgroundColor: isDark ? '#1E293B' : '#EFF6FF', borderColor: isDark ? '#334155' : '#BFDBFE' }]}>
          <Text style={{ fontSize: 11, fontWeight: '800', color: isDark ? '#60A5FA' : '#2563EB' }}>
            {trackedList.length}
          </Text>
        </View>
      </View>

      {/* SEARCH AND FILTER BAR */}
      <View style={[styles.searchFilterContainer, { backgroundColor: cardBg, borderBottomColor: borderColor }]}>
        {/* Search Input */}
        <View style={[styles.searchBox, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9', borderColor }]}>
          <Search size={16} color={mutedTextColor} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={language === 'hi' ? 'जॉब या रोल नंबर खोजें...' : 'Search jobs or roll no...'}
            placeholderTextColor={mutedTextColor}
            style={[styles.searchInput, { color: textColor }]}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <X size={16} color={mutedTextColor} />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter Pills */}
        <View style={styles.filterPillsRow}>
          <TouchableOpacity
            onPress={() => setFilter('all')}
            style={[
              styles.filterPill,
              filter === 'all'
                ? { backgroundColor: '#2563EB' }
                : { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' },
            ]}
          >
            <Text
              style={[
                styles.filterPillText,
                { color: filter === 'all' ? '#FFFFFF' : (isDark ? '#94A3B8' : '#475569') },
              ]}
            >
              {language === 'hi' ? 'सभी' : 'All'} ({trackedList.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setFilter('applied')}
            style={[
              styles.filterPill,
              filter === 'applied'
                ? { backgroundColor: '#10B981' }
                : { backgroundColor: isDark ? '#1E293B' : '#ECFDF5' },
            ]}
          >
            <Text
              style={[
                styles.filterPillText,
                { color: filter === 'applied' ? '#FFFFFF' : '#059669' },
              ]}
            >
              {language === 'hi' ? 'आवेदन किया गया' : 'Applied'} ({appliedCount})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setFilter('saved')}
            style={[
              styles.filterPill,
              filter === 'saved'
                ? { backgroundColor: '#3B82F6' }
                : { backgroundColor: isDark ? '#1E293B' : '#EFF6FF' },
            ]}
          >
            <Text
              style={[
                styles.filterPillText,
                { color: filter === 'saved' ? '#FFFFFF' : '#2563EB' },
              ]}
            >
              {language === 'hi' ? 'सेव किया गया' : 'Saved'} ({savedCount})
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* JOBS LIST */}
      <ScrollView
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {filteredJobs.length > 0 ? (
          <View style={{ gap: 12 }}>
            {filteredJobs.map((job: any) => {
              const matchingNotice = notices.find((n) => n.id === job.noticeId);
              return (
                <View
                  key={job.noticeId}
                  style={[
                    styles.jobCard,
                    {
                      backgroundColor: itemBg,
                      borderColor: isDark ? '#334155' : '#E2E8F0',
                    },
                  ]}
                >
                  {/* Top Status Badges Row */}
                  <View style={styles.badgeRow}>
                    <View style={styles.badgeGroup}>
                      {job.isApplied && (
                        <View style={styles.appliedBadge}>
                          <CheckCircle2 size={11} color="#059669" />
                          <Text style={styles.appliedBadgeText}>APPLIED</Text>
                        </View>
                      )}
                      {job.isSaved && (
                        <View style={styles.savedBadge}>
                          <Bookmark size={11} color="#2563EB" />
                          <Text style={styles.savedBadgeText}>SAVED</Text>
                        </View>
                      )}
                    </View>

                    {job.appliedDate ? (
                      <View style={[styles.dateBadge, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC', borderColor }]}>
                        <Clock size={11} color={mutedTextColor} />
                        <Text style={[styles.dateBadgeText, { color: mutedTextColor }]}>
                          Applied: {job.appliedDate}
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  {/* Job Title */}
                  <Text style={[styles.jobTitle, { color: textColor }]}>
                    {job.title}
                  </Text>

                  {/* Application No Badge if exists */}
                  {job.applicationNo ? (
                    <View style={[styles.appNoBox, { backgroundColor: isDark ? '#062C1E' : '#ECFDF5', borderColor: isDark ? '#065F46' : '#A7F3D0' }]}>
                      <Text style={{ fontSize: 10, fontWeight: '700', color: isDark ? '#34D399' : '#059669' }}>
                        Reg / Roll No: <Text style={{ fontWeight: '900', fontFamily: 'monospace' }}>{job.applicationNo}</Text>
                      </Text>
                    </View>
                  ) : null}

                  {/* Metadata Row (Notice date & deadline) */}
                  <View style={styles.metaRow}>
                    {job.date ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Calendar size={11} color={mutedTextColor} />
                        <Text style={[styles.metaText, { color: mutedTextColor }]}>
                          Date: {job.date}
                        </Text>
                      </View>
                    ) : null}
                    {job.lastDate ? (
                      <Text style={styles.deadlineText}>
                        Last Date: {job.lastDate}
                      </Text>
                    ) : null}
                  </View>

                  {/* Actions Footer */}
                  <View style={[styles.cardFooter, { borderTopColor: isDark ? '#334155' : '#F1F5F9' }]}>
                    <TouchableOpacity
                      style={[styles.viewInfoBtn, { backgroundColor: isDark ? '#0F172A' : '#EFF6FF', borderColor: isDark ? '#2563EB' : '#BFDBFE' }]}
                      onPress={() => {
                        if (matchingNotice) {
                          onOpenNotice(matchingNotice);
                        } else {
                          onOpenNotice({
                            id: job.noticeId,
                            title: job.title,
                            category: job.category,
                            date: job.date,
                            lastDate: job.lastDate,
                          });
                        }
                      }}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.viewInfoText}>
                        {language === 'hi' ? 'विवरण देखें' : 'View Full Details'}
                      </Text>
                      <ExternalLink size={12} color="#2563EB" />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.removeBtn}
                      onPress={() => {
                        setJobToRemove({ noticeId: job.noticeId, title: job.title });
                      }}
                      activeOpacity={0.7}
                    >
                      <Trash2 size={13} color="#EF4444" />
                      <Text style={styles.removeText}>
                        {language === 'hi' ? 'हटाएं' : 'Remove'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <View style={[styles.emptyIconCircle, { backgroundColor: isDark ? '#1E293B' : '#EFF6FF' }]}>
              <Bookmark size={32} color={isDark ? '#60A5FA' : '#3B82F6'} />
            </View>
            <Text style={[styles.emptyTitle, { color: textColor }]}>
              {language === 'hi' ? 'कोई ट्रैक की गई जॉब नहीं मिली' : 'No Tracked Jobs Found'}
            </Text>
            <Text style={[styles.emptySubtitle, { color: mutedTextColor }]}>
              {searchQuery.trim()
                ? (language === 'hi' ? 'अपनी खोज से मेल खाने वाली कोई जॉब नहीं मिली।' : 'No jobs matched your search term.')
                : (language === 'hi'
                    ? 'अधिसूचना विवरण में "Save Job" या "Mark as Applied" दबाकर जॉब्स को यहां ट्रैक करें।'
                    : 'Open any recruitment announcement and tap "Save Job" or "Mark as Applied" to track your applications here.')}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* CONFIRMATION POPUP MODAL FOR REMOVING TRACKED JOB */}
      <Modal
        visible={!!jobToRemove}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          if (!isRemovingJob) setJobToRemove(null);
        }}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF', borderColor: isDark ? '#334155' : '#E2E8F0' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 14 }}>
              <View style={[styles.trashIconBadge, { backgroundColor: isDark ? '#4C0519' : '#FFE4E6', borderColor: isDark ? '#9F1239' : '#FECDD3' }]}>
                <Trash2 size={22} color={isDark ? '#FB7185' : '#E11D48'} />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={[styles.modalHeading, { color: isDark ? '#FFFFFF' : '#0F172A' }]}>
                  {language === 'hi' ? 'ट्रैकर से जॉब हटाएं?' : 'Remove Job from Tracker?'}
                </Text>
                <Text style={[styles.modalSubheading, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                  {language === 'hi'
                    ? `क्या आप वास्तव में '${jobToRemove?.title}' को अपने आवेदन और सेव किए गए जॉब ट्रैकर से हटाना चाहते हैं?`
                    : `Are you sure you want to remove '${jobToRemove?.title}' from your saved & applied jobs tracker?`}
                </Text>
              </View>
            </View>

            <View style={[styles.modalInfoBox, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC', borderColor: isDark ? '#334155' : '#E2E8F0' }]}>
              <Text style={{ fontSize: 11, fontWeight: '500', color: isDark ? '#94A3B8' : '#64748B', lineHeight: 16 }}>
                {language === 'hi'
                  ? 'यह क्रिया आपके प्रोफाइल से इस जॉब के स्टेटस, आवेदन तिथि और रोल नंबर को हटा देगी।'
                  : 'This action will reset your tracked status, application date, and registration details for this notification.'}
              </Text>
            </View>

            <View style={styles.modalButtonsRow}>
              <TouchableOpacity
                disabled={isRemovingJob}
                onPress={() => setJobToRemove(null)}
                style={[styles.modalCancelBtn, { backgroundColor: isDark ? '#334155' : '#F1F5F9', borderColor: isDark ? '#475569' : '#E2E8F0' }]}
              >
                <Text style={[styles.modalCancelText, { color: isDark ? '#E2E8F0' : '#475569' }]}>
                  {language === 'hi' ? 'रद्द करें' : 'Cancel'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                disabled={isRemovingJob}
                onPress={handleConfirmRemoveJob}
                style={styles.modalDeleteBtn}
              >
                {isRemovingJob ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Trash2 size={14} color="#FFFFFF" />
                    <Text style={styles.modalDeleteText}>
                      {language === 'hi' ? 'हाँ, हटाएं' : 'Yes, Remove Job'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  navbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingRight: 8,
  },
  backText: {
    fontSize: 14,
    fontWeight: '700',
  },
  navTitle: {
    fontSize: 15,
    fontWeight: '900',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 8,
  },
  countBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  searchFilterContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 10,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    padding: 0,
  },
  filterPillsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  filterPillText: {
    fontSize: 11,
    fontWeight: '800',
  },
  listContent: {
    padding: 16,
  },
  jobCard: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 6,
  },
  badgeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  appliedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    borderColor: '#10B981',
    borderWidth: 1,
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  appliedBadgeText: {
    color: '#059669',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  savedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EFF6FF',
    borderColor: '#3B82F6',
    borderWidth: 1,
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  savedBadgeText: {
    color: '#2563EB',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  dateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 6,
    borderWidth: 1,
  },
  dateBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  jobTitle: {
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 20,
  },
  appNoBox: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  metaText: {
    fontSize: 10.5,
    fontWeight: '600',
  },
  deadlineText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#E11D48',
    textTransform: 'uppercase',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
  },
  viewInfoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  viewInfoText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#2563EB',
  },
  removeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  removeText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#EF4444',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
    gap: 12,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 280,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    borderRadius: 24,
    padding: 22,
    width: '100%',
    maxWidth: 380,
    borderWidth: 1,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    gap: 16,
  },
  trashIconBadge: {
    width: 48,
    height: 48,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalHeading: {
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 4,
  },
  modalSubheading: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 18,
  },
  modalInfoBox: {
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  modalButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 4,
  },
  modalCancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  modalCancelText: {
    fontSize: 12,
    fontWeight: '700',
  },
  modalDeleteBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#E11D48',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    elevation: 2,
    shadowColor: '#E11D48',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  modalDeleteText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#FFFFFF',
  },
});
