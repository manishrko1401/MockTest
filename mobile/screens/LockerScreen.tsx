import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  FlatList,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  Linking,
  Platform,
  Image,
  Dimensions,
} from 'react-native';
import {
  FolderLock,
  Cloud,
  CloudOff,
  Upload,
  Plus,
  Search,
  FileText,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Download,
  Trash2,
  ShieldCheck,
  Info,
  ChevronRight,
  ArrowLeft,
  X,
  Sparkles,
  Award,
  RefreshCw,
  Eye,
  FileCheck,
  Camera,
  Share2,
} from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import Constants from 'expo-constants';
import { ApiClient } from '../api';
import { ThemeColors } from '../theme';
import { SpinningDotsLoader } from '../SpinningDotsLoader';
import {
  saveGoogleDriveSession,
  getSavedGoogleDriveSession,
  clearGoogleDriveSession,
  getOrCreateLockerRootFolder,
  getOrCreateLockerSubFolder,
  uploadNativeFileToGoogleDrive,
  deleteFileFromGoogleDrive,
  GOOGLE_DRIVE_SCOPE,
} from '../utils/googleDrive';

WebBrowser.maybeCompleteAuthSession();

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export interface LockerDoc {
  id: string;
  userId: string;
  title: string;
  docType: 'PHOTO' | 'SIGNATURE' | 'ADMIT_CARD' | 'APPLICATION_FORM' | 'CERTIFICATE' | 'ID_PROOF' | 'OTHER';
  examName?: string | null;
  year?: number | null;
  driveFileId: string;
  driveFolderId?: string | null;
  driveViewUrl?: string | null;
  driveDownloadUrl?: string | null;
  thumbnailUrl?: string | null;
  mimeType: string;
  fileSizeBytes: number;
  tags?: any;
  createdAt: string;
}

interface LockerScreenProps {
  currentUser: any;
  onBack: () => void;
  isDark?: boolean;
  language?: 'en' | 'hi';
}

const CATEGORIES = [
  { id: 'ALL', labelEn: 'All Files', labelHi: 'सभी फाइलें', icon: 'FolderLock' },
  { id: 'ADMIT_CARD', labelEn: 'Admit Cards', labelHi: 'प्रवेश पत्र', icon: 'Award' },
  { id: 'APPLICATION_FORM', labelEn: 'Forms', labelHi: 'आवेदन फॉर्म', icon: 'FileText' },
  { id: 'PHOTO', labelEn: 'Photos', labelHi: 'फोटो', icon: 'ImageIcon' },
  { id: 'SIGNATURE', labelEn: 'Signatures', labelHi: 'हस्ताक्षर', icon: 'FileCheck' },
  { id: 'CERTIFICATE', labelEn: 'Certificates', labelHi: 'प्रमाण पत्र', icon: 'ShieldCheck' },
  { id: 'ID_PROOF', labelEn: 'ID Proofs', labelHi: 'आईडी प्रूफ', icon: 'Info' },
];

export default function LockerScreen({
  currentUser,
  onBack,
  isDark = false,
  language = 'en',
}: LockerScreenProps) {
  const [documents, setDocuments] = useState<LockerDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isDriveConnected, setIsDriveConnected] = useState(false);
  const [driveEmail, setDriveEmail] = useState<string | null>(null);
  const [rootFolderId, setRootFolderId] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  // Filters
  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<LockerDoc | null>(null);
  const [docToDelete, setDocToDelete] = useState<LockerDoc | null>(null);

  // Upload Form State
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadDocType, setUploadDocType] = useState<string>('ADMIT_CARD');
  const [uploadExamName, setUploadExamName] = useState('');
  const [uploadYear, setUploadYear] = useState<string>(new Date().getFullYear().toString());
  const [selectedFile, setSelectedFile] = useState<{ uri: string; name: string; mimeType: string; size: number } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgressMsg, setUploadProgressMsg] = useState('');
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Google Auth Request Hook
  const googleAndroidClientId =
    (Constants as any).expoConfig?.extra?.googleAndroidClientId ||
    process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ||
    '';
  const googleWebClientId =
    (Constants as any).expoConfig?.extra?.googleWebClientId ||
    process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ||
    '570110856860-a2h946nit7obiguglnjedffflto1oq95.apps.googleusercontent.com';

  const [request, response, promptAsync] = Google.useAuthRequest({
    androidClientId: googleAndroidClientId || undefined,
    webClientId: googleWebClientId || undefined,
    scopes: [GOOGLE_DRIVE_SCOPE],
  });

  // Handle Google Auth Response
  useEffect(() => {
    if (response?.type === 'success' && response.authentication?.accessToken) {
      const token = response.authentication.accessToken;
      handleGoogleAuthSuccess(token);
    }
  }, [response]);

  const handleGoogleAuthSuccess = async (token: string) => {
    try {
      setAccessToken(token);
      let email = '';
      try {
        const infoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (infoRes.ok) {
          const info = await infoRes.json();
          email = info.email || '';
          setDriveEmail(email);
        }
      } catch (e) {}

      await saveGoogleDriveSession(token, email);

      // Create or resolve root folder in Drive
      const folderId = await getOrCreateLockerRootFolder(token);
      setRootFolderId(folderId);
      setIsDriveConnected(true);

      // Save to Backend
      if (currentUser?.id) {
        await ApiClient.lockerUpdateDriveStatus({
          userId: currentUser.id,
          isConnected: true,
          googleDriveEmail: email || null,
          googleDriveFolderId: folderId,
        });
      }
      Alert.alert(
        language === 'hi' ? 'गूगल ड्राइव कनेक्टेड' : 'Google Drive Connected',
        language === 'hi'
          ? 'आपका दस्तावेज़ लॉकर आपके गूगल ड्राइव से सफलतापूर्वक लिंक हो गया है।'
          : 'Your Document Locker is now linked to your Google Drive.'
      );
    } catch (err: any) {
      Alert.alert('Connection Error', err.message || 'Failed to initialize Google Drive folder');
    }
  };

  // Load Saved Session & Backend Documents
  const loadLockerData = async () => {
    if (!currentUser?.id) return;
    try {
      setLoading(true);
      // 1. Check local secure storage for cached token
      const session = await getSavedGoogleDriveSession();
      if (session.accessToken) {
        setAccessToken(session.accessToken);
        if (session.email) setDriveEmail(session.email);
      }

      // 2. Fetch documents from backend
      const res = await ApiClient.lockerGetDocs(currentUser.id);
      if (res.success) {
        setDocuments(res.documents || []);
        setIsDriveConnected(!!res.user?.isLockerConnected);
        if (res.user?.googleDriveEmail) setDriveEmail(res.user.googleDriveEmail);
        if (res.user?.googleDriveFolderId) setRootFolderId(res.user.googleDriveFolderId);
      }
    } catch (err) {
      console.warn('[Locker] Load error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadLockerData();
  }, [currentUser]);

  // Connect Google Drive
  const handleConnectDrive = () => {
    if (promptAsync) {
      promptAsync();
    } else {
      Alert.alert('Notice', 'Google authentication is initializing. Please try again in a moment.');
    }
  };

  // Disconnect Drive
  const handleDisconnectDrive = () => {
    Alert.alert(
      language === 'hi' ? 'गूगल ड्राइव डिस्कनेक्ट करें?' : 'Disconnect Google Drive?',
      language === 'hi'
        ? 'आपकी फाइलें आपके गूगल ड्राइव में सुरक्षित रहेंगी।'
        : 'Your files will remain safe in your Google Drive, but will not show in the app until reconnected.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: async () => {
            await clearGoogleDriveSession();
            setAccessToken(null);
            setDriveEmail(null);
            setIsDriveConnected(false);
            if (currentUser?.id) {
              await ApiClient.lockerDisconnectDrive(currentUser.id);
            }
          },
        },
      ]
    );
  };

  // Pick Document (PDF / Doc)
  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        setSelectedFile({
          uri: file.uri,
          name: file.name,
          mimeType: file.mimeType || 'application/pdf',
          size: file.size || 0,
        });
        if (!uploadTitle.trim()) {
          setUploadTitle(file.name.replace(/\.[^/.]+$/, ''));
        }
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to pick file');
    }
  };

  // Pick Image from Gallery
  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.85,
        allowsEditing: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const fileName = asset.fileName || `Photo_${Date.now()}.jpg`;
        setSelectedFile({
          uri: asset.uri,
          name: fileName,
          mimeType: asset.mimeType || 'image/jpeg',
          size: asset.fileSize || 0,
        });
        if (!uploadTitle.trim()) {
          setUploadTitle(fileName.replace(/\.[^/.]+$/, ''));
        }
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to select image');
    }
  };

  // Capture Photo via Camera
  const handleCaptureCamera = async () => {
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission Required', 'Camera permission is needed to capture photos for your locker.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        quality: 0.85,
        allowsEditing: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const fileName = `PassportPhoto_${Date.now()}.jpg`;
        setSelectedFile({
          uri: asset.uri,
          name: fileName,
          mimeType: 'image/jpeg',
          size: asset.fileSize || 0,
        });
        setUploadDocType('PHOTO');
        if (!uploadTitle.trim()) {
          setUploadTitle('Passport Photo');
        }
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to capture camera photo');
    }
  };

  // Submit Upload
  const handleUploadSubmit = async () => {
    if (!selectedFile) {
      setUploadError('Please select a file or document to upload');
      return;
    }
    if (!uploadTitle.trim()) {
      setUploadError('Please enter a document title');
      return;
    }

    setUploading(true);
    setUploadError(null);

    try {
      let token = accessToken;
      if (!token) {
        setUploadProgressMsg('Authenticating with Google Drive...');
        if (promptAsync) {
          await promptAsync();
          // After auth, session hook triggers
        }
        token = (await getSavedGoogleDriveSession()).accessToken;
      }

      if (!token) {
        throw new Error('Please connect your Google Drive account first.');
      }

      setUploadProgressMsg('Resolving Locker Folder in your Google Drive...');
      let targetFolderId = rootFolderId;
      if (!targetFolderId) {
        targetFolderId = await getOrCreateLockerRootFolder(token);
        setRootFolderId(targetFolderId);
      }

      const subFolderName =
        uploadDocType === 'ADMIT_CARD'
          ? 'Admit Cards & Hall Tickets'
          : uploadDocType === 'APPLICATION_FORM'
          ? 'Application Forms'
          : uploadDocType === 'PHOTO'
          ? 'Passport Photos'
          : uploadDocType === 'SIGNATURE'
          ? 'Signatures'
          : uploadDocType === 'CERTIFICATE'
          ? 'Certificates'
          : uploadDocType === 'ID_PROOF'
          ? 'ID Proofs'
          : 'Other Documents';

      const subFolderId = await getOrCreateLockerSubFolder(token, targetFolderId, subFolderName);

      setUploadProgressMsg('Uploading file directly to your Google Drive...');
      const cleanFileName = `${uploadTitle.trim().replace(/[^a-zA-Z0-9_-]/g, '_')}_${Date.now()}.${
        selectedFile.name.split('.').pop() || 'dat'
      }`;

      const driveFile = await uploadNativeFileToGoogleDrive(
        token,
        selectedFile.uri,
        cleanFileName,
        selectedFile.mimeType,
        subFolderId
      );

      setUploadProgressMsg('Saving document metadata...');
      const res = await ApiClient.lockerSaveMeta({
        userId: currentUser.id,
        title: uploadTitle.trim(),
        docType: uploadDocType,
        examName: uploadExamName.trim() || null,
        year: uploadYear ? parseInt(uploadYear, 10) : null,
        driveFileId: driveFile.id,
        driveFolderId: subFolderId,
        driveViewUrl: driveFile.webViewLink,
        driveDownloadUrl: `https://drive.google.com/uc?export=download&id=${driveFile.id}`,
        thumbnailUrl: driveFile.thumbnailLink || null,
        mimeType: driveFile.mimeType,
        fileSizeBytes: driveFile.size || selectedFile.size,
      });

      if (!res.success) {
        throw new Error(res.error || 'Failed to save document metadata');
      }

      // Reset Form & Refresh
      setIsUploadModalOpen(false);
      setUploadTitle('');
      setUploadExamName('');
      setSelectedFile(null);
      loadLockerData();
      Alert.alert(
        language === 'hi' ? 'सफलता' : 'Success',
        language === 'hi' ? 'दस्तावेज़ आपके गूगल ड्राइव में सुरक्षित हो गया है।' : 'Document saved to your Google Drive Locker!'
      );
    } catch (err: any) {
      setUploadError(err.message || 'Upload failed. Please check network and permissions.');
    } finally {
      setUploading(false);
      setUploadProgressMsg('');
    }
  };

  // Delete Document
  const handleDeleteDoc = async () => {
    if (!docToDelete || !currentUser?.id) return;
    try {
      if (accessToken && docToDelete.driveFileId) {
        try {
          await deleteFileFromGoogleDrive(accessToken, docToDelete.driveFileId);
        } catch (e) {
          console.warn('[Locker] Drive delete warning:', e);
        }
      }

      await ApiClient.lockerDeleteDoc(docToDelete.id, currentUser.id);
      setDocuments((prev) => prev.filter((d) => d.id !== docToDelete.id));
      setDocToDelete(null);
    } catch (err) {
      Alert.alert('Error', 'Failed to delete document from locker');
    }
  };

  // Filtered List
  const filteredDocs = useMemo(() => {
    return documents.filter((doc) => {
      if (activeCategory !== 'ALL' && doc.docType !== activeCategory) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = doc.title.toLowerCase().includes(q);
        const matchesExam = (doc.examName || '').toLowerCase().includes(q);
        return matchesTitle || matchesExam;
      }
      return true;
    });
  }, [documents, activeCategory, searchQuery]);

  const formatSize = (bytes: number) => {
    if (!bytes || bytes === 0) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const bg = isDark ? '#0B132B' : '#F8FAFC';
  const cardBg = isDark ? '#1C2541' : '#FFFFFF';
  const textColor = isDark ? '#FFFFFF' : '#0F172A';
  const textMuted = isDark ? '#94A3B8' : '#64748B';
  const borderColor = isDark ? '#2D3A5F' : '#E2E8F0';

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: cardBg, borderBottomColor: borderColor }]}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <ArrowLeft size={22} color={textColor} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={[styles.headerTitle, { color: textColor }]}>
              {language === 'hi' ? 'दस्तावेज़ लॉकर' : 'Document Locker'}
            </Text>
            <View style={styles.driveBadge}>
              <Text style={styles.driveBadgeText}>Google Drive</Text>
            </View>
          </View>
          <Text style={[styles.headerSub, { color: textMuted }]}>
            {language === 'hi' ? 'निजी एवं 100% सुरक्षित' : 'Private & Secure Exam Storage'}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => setIsUploadModalOpen(true)}
          style={styles.addBtn}
          activeOpacity={0.8}
        >
          <Plus size={16} color="#FFF" />
          <Text style={styles.addBtnText}>{language === 'hi' ? 'जोड़ें' : 'Upload'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Google Drive Status Banner */}
        <View style={[styles.statusCard, { backgroundColor: isDark ? '#152238' : '#EFF6FF', borderColor: isDark ? '#1E3A8A' : '#BFDBFE' }]}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
            <View style={[styles.cloudIconBox, { backgroundColor: isDark ? '#1E3A8A' : '#DBEAFE' }]}>
              {isDriveConnected ? <Cloud size={24} color="#2563EB" /> : <CloudOff size={24} color="#D97706" />}
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <Text style={[styles.statusTitle, { color: textColor }]}>
                  {language === 'hi' ? 'गूगल ड्राइव क्लाउड स्टोरेज' : 'Personal Google Drive Sync'}
                </Text>
                {isDriveConnected ? (
                  <View style={styles.connectedTag}>
                    <CheckCircle2 size={10} color="#10B981" />
                    <Text style={styles.connectedTagText}>{language === 'hi' ? 'कनेक्टेड' : 'Connected'}</Text>
                  </View>
                ) : (
                  <View style={[styles.connectedTag, { backgroundColor: '#FEF3C7' }]}>
                    <Text style={[styles.connectedTagText, { color: '#D97706' }]}>{language === 'hi' ? 'अनलिंक्ड' : 'Not Linked'}</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.statusDesc, { color: textMuted }]}>
                {isDriveConnected && driveEmail
                  ? `${language === 'hi' ? 'फाइलें सुरक्षित हैं:' : 'Files stored securely in'} ${driveEmail}`
                  : language === 'hi'
                  ? 'अपने गूगल खाते को लिंक करें ताकि आपकी फाइलें आपके ड्राइव में सेव हों।'
                  : 'Link your Google account to automatically store admit cards, forms, and photos in your Drive.'}
              </Text>
            </View>
          </View>

          <View style={{ marginTop: 12, flexDirection: 'row', justifyContent: 'flex-end', gap: 8 }}>
            {isDriveConnected ? (
              <TouchableOpacity onPress={handleDisconnectDrive} style={styles.disconnectBtn}>
                <Text style={styles.disconnectBtnText}>{language === 'hi' ? 'डिस्कनेक्ट करें' : 'Disconnect'}</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={handleConnectDrive} style={styles.connectBtn}>
                <Cloud size={14} color="#FFF" />
                <Text style={styles.connectBtnText}>{language === 'hi' ? 'गूगल ड्राइव जोड़ें' : 'Connect Google Drive'}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Search Bar */}
        <View style={[styles.searchBar, { backgroundColor: cardBg, borderColor }]}>
          <Search size={16} color={textMuted} />
          <TextInput
            placeholder={language === 'hi' ? 'परीक्षा नाम या शीर्षक से खोजें...' : 'Search by exam (SSC, CTET) or title...'}
            placeholderTextColor={textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={[styles.searchInput, { color: textColor }]}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X size={16} color={textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Category Horizontal Filter Pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillsRow}>
          {CATEGORIES.map((cat) => {
            const isActive = activeCategory === cat.id;
            const count =
              cat.id === 'ALL'
                ? documents.length
                : documents.filter((d) => d.docType === cat.id).length;

            return (
              <TouchableOpacity
                key={cat.id}
                onPress={() => setActiveCategory(cat.id)}
                style={[
                  styles.pill,
                  { backgroundColor: isActive ? '#2563EB' : cardBg, borderColor: isActive ? '#2563EB' : borderColor },
                ]}
              >
                <Text style={[styles.pillText, { color: isActive ? '#FFFFFF' : textColor }]}>
                  {language === 'hi' ? cat.labelHi : cat.labelEn}
                </Text>
                <View style={[styles.pillBadge, { backgroundColor: isActive ? 'rgba(255,255,255,0.25)' : isDark ? '#2D3A5F' : '#E2E8F0' }]}>
                  <Text style={[styles.pillBadgeText, { color: isActive ? '#FFFFFF' : textMuted }]}>{count}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Documents Grid / List */}
        {loading ? (
          <View style={styles.centerLoading}>
            <ActivityIndicator size="large" color="#2563EB" />
            <Text style={[styles.loadingText, { color: textMuted }]}>Loading documents...</Text>
          </View>
        ) : filteredDocs.length === 0 ? (
          <View style={[styles.emptyBox, { backgroundColor: cardBg, borderColor }]}>
            <View style={[styles.emptyIconCircle, { backgroundColor: isDark ? '#1E3A8A' : '#EFF6FF' }]}>
              <FolderLock size={32} color="#2563EB" />
            </View>
            <Text style={[styles.emptyTitle, { color: textColor }]}>
              {language === 'hi' ? 'कोई दस्तावेज़ नहीं मिला' : 'No Documents in this category'}
            </Text>
            <Text style={[styles.emptySub, { color: textMuted }]}>
              {language === 'hi'
                ? 'अपने प्रवेश पत्र, आवेदन फॉर्म, फोटो या हस्ताक्षर यहां सुरक्षित रखें।'
                : 'Upload your admit cards, confirmation forms, passport photos, and certificates.'}
            </Text>
            <TouchableOpacity onPress={() => setIsUploadModalOpen(true)} style={styles.emptyUploadBtn}>
              <Upload size={14} color="#FFF" />
              <Text style={styles.emptyUploadBtnText}>{language === 'hi' ? 'दस्तावेज़ अपलोड करें' : 'Upload Document'}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.docsGrid}>
            {filteredDocs.map((doc) => {
              const isPdf = doc.mimeType?.includes('pdf') || doc.title.toLowerCase().endsWith('.pdf');
              return (
                <View key={doc.id} style={[styles.docCard, { backgroundColor: cardBg, borderColor }]}>
                  <View style={styles.docCardHeader}>
                    <View style={styles.docTypeBadge}>
                      <Text style={styles.docTypeBadgeText}>{doc.docType.replace('_', ' ')}</Text>
                    </View>
                    {doc.year && <Text style={[styles.docYearText, { color: textMuted }]}>{doc.year}</Text>}
                  </View>

                  <TouchableOpacity
                    onPress={() => setPreviewDoc(doc)}
                    activeOpacity={0.8}
                    style={[styles.docPreviewBox, { backgroundColor: isDark ? '#152238' : '#F1F5F9' }]}
                  >
                    {doc.thumbnailUrl ? (
                      <Image source={{ uri: doc.thumbnailUrl }} style={styles.previewImage} resizeMode="cover" />
                    ) : isPdf ? (
                      <View style={styles.previewFallback}>
                        <FileText size={32} color="#EF4444" />
                        <Text style={styles.pdfLabel}>PDF DOCUMENT</Text>
                      </View>
                    ) : (
                      <View style={styles.previewFallback}>
                        <ImageIcon size={32} color="#2563EB" />
                        <Text style={[styles.pdfLabel, { color: '#2563EB' }]}>IMAGE FILE</Text>
                      </View>
                    )}
                  </TouchableOpacity>

                  <Text style={[styles.docTitle, { color: textColor }]} numberOfLines={1}>
                    {doc.title}
                  </Text>
                  {doc.examName && (
                    <Text style={styles.docExamName} numberOfLines={1}>
                      🎯 {doc.examName}
                    </Text>
                  )}
                  <Text style={[styles.docMeta, { color: textMuted }]}>
                    {formatSize(doc.fileSizeBytes)} • {new Date(doc.createdAt).toLocaleDateString()}
                  </Text>

                  <View style={[styles.docActionsRow, { borderTopColor: borderColor }]}>
                    <TouchableOpacity
                      onPress={() => {
                        if (doc.driveViewUrl) Linking.openURL(doc.driveViewUrl);
                      }}
                      style={styles.actionIconBtn}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    >
                      <ExternalLink size={16} color="#2563EB" />
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => setDocToDelete(doc)}
                      style={styles.actionIconBtn}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    >
                      <Trash2 size={16} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Reference Specifications Card */}
        <View style={[styles.specsCard, { backgroundColor: cardBg, borderColor }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <Info size={16} color="#2563EB" />
            <Text style={[styles.specsTitle, { color: textColor }]}>
              {language === 'hi' ? 'मानक परीक्षा दस्तावेज़ दिशानिर्देश' : 'Exam Document Specifications Reference'}
            </Text>
          </View>
          <View style={styles.specsGrid}>
            <View style={[styles.specItem, { backgroundColor: isDark ? '#152238' : '#F8FAFC' }]}>
              <Text style={styles.specItemHead}>SSC (CGL/CHSL)</Text>
              <Text style={[styles.specItemDesc, { color: textMuted }]}>Photo: 20-50 KB</Text>
              <Text style={[styles.specItemDesc, { color: textMuted }]}>Sign: 10-20 KB</Text>
            </View>
            <View style={[styles.specItem, { backgroundColor: isDark ? '#152238' : '#F8FAFC' }]}>
              <Text style={[styles.specItemHead, { color: '#9333EA' }]}>UPSC / State PSC</Text>
              <Text style={[styles.specItemDesc, { color: textMuted }]}>Photo: 20-300 KB</Text>
              <Text style={[styles.specItemDesc, { color: textMuted }]}>Sign: 20-300 KB</Text>
            </View>
            <View style={[styles.specItem, { backgroundColor: isDark ? '#152238' : '#F8FAFC' }]}>
              <Text style={[styles.specItemHead, { color: '#059669' }]}>Banking / IBPS</Text>
              <Text style={[styles.specItemDesc, { color: textMuted }]}>Photo: 20-50 KB</Text>
              <Text style={[styles.specItemDesc, { color: textMuted }]}>Sign: 10-20 KB</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Upload Modal */}
      {isUploadModalOpen && (
        <Modal visible={isUploadModalOpen} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalBox, { backgroundColor: cardBg }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: textColor }]}>
                  {language === 'hi' ? 'दस्तावेज़ जोड़ें' : 'Upload to Document Locker'}
                </Text>
                <TouchableOpacity onPress={() => !uploading && setIsUploadModalOpen(false)}>
                  <X size={20} color={textMuted} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 450 }}>
                {/* Pick Options Row */}
                <Text style={[styles.inputLabel, { color: textMuted }]}>SELECT SOURCE *</Text>
                <View style={styles.sourceButtonsRow}>
                  <TouchableOpacity onPress={handlePickDocument} style={styles.sourceBtn}>
                    <FileText size={18} color="#2563EB" />
                    <Text style={styles.sourceBtnText}>PDF / File</Text>
                  </TouchableOpacity>

                  <TouchableOpacity onPress={handlePickImage} style={styles.sourceBtn}>
                    <ImageIcon size={18} color="#9333EA" />
                    <Text style={styles.sourceBtnText}>Gallery</Text>
                  </TouchableOpacity>

                  <TouchableOpacity onPress={handleCaptureCamera} style={styles.sourceBtn}>
                    <Camera size={18} color="#059669" />
                    <Text style={styles.sourceBtnText}>Camera</Text>
                  </TouchableOpacity>
                </View>

                {selectedFile && (
                  <View style={[styles.selectedFilePill, { backgroundColor: isDark ? '#152238' : '#EFF6FF' }]}>
                    <CheckCircle2 size={14} color="#2563EB" />
                    <Text style={[styles.selectedFileName, { color: textColor }]} numberOfLines={1}>
                      {selectedFile.name} ({formatSize(selectedFile.size)})
                    </Text>
                  </View>
                )}

                {/* Title */}
                <Text style={[styles.inputLabel, { color: textMuted, marginTop: 12 }]}>DOCUMENT TITLE *</Text>
                <TextInput
                  placeholder="e.g. SSC CGL 2026 Admit Card"
                  placeholderTextColor={textMuted}
                  value={uploadTitle}
                  onChangeText={setUploadTitle}
                  style={[styles.modalInput, { color: textColor, borderColor }]}
                />

                {/* Doc Type Selector */}
                <Text style={[styles.inputLabel, { color: textMuted, marginTop: 12 }]}>CATEGORY *</Text>
                <View style={styles.categoryPickerRow}>
                  {['ADMIT_CARD', 'APPLICATION_FORM', 'PHOTO', 'SIGNATURE', 'CERTIFICATE', 'ID_PROOF'].map((t) => (
                    <TouchableOpacity
                      key={t}
                      onPress={() => setUploadDocType(t)}
                      style={[
                        styles.catOptionPill,
                        {
                          backgroundColor: uploadDocType === t ? '#2563EB' : isDark ? '#152238' : '#F1F5F9',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.catOptionText,
                          { color: uploadDocType === t ? '#FFF' : textMuted },
                        ]}
                      >
                        {t.replace('_', ' ')}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Exam Name & Year */}
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.inputLabel, { color: textMuted }]}>EXAM NAME</Text>
                    <TextInput
                      placeholder="e.g. SSC CGL"
                      placeholderTextColor={textMuted}
                      value={uploadExamName}
                      onChangeText={setUploadExamName}
                      style={[styles.modalInput, { color: textColor, borderColor }]}
                    />
                  </View>
                  <View style={{ width: 90 }}>
                    <Text style={[styles.inputLabel, { color: textMuted }]}>YEAR</Text>
                    <TextInput
                      keyboardType="numeric"
                      value={uploadYear}
                      onChangeText={setUploadYear}
                      style={[styles.modalInput, { color: textColor, borderColor }]}
                    />
                  </View>
                </View>

                {uploadError && (
                  <Text style={styles.errorText}>
                    <AlertCircle size={12} color="#EF4444" /> {uploadError}
                  </Text>
                )}

                {uploadProgressMsg ? (
                  <View style={styles.progressBox}>
                    <ActivityIndicator size="small" color="#2563EB" />
                    <Text style={styles.progressText}>{uploadProgressMsg}</Text>
                  </View>
                ) : null}
              </ScrollView>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  onPress={() => setIsUploadModalOpen(false)}
                  disabled={uploading}
                  style={styles.cancelBtn}
                >
                  <Text style={[styles.cancelBtnText, { color: textMuted }]}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleUploadSubmit}
                  disabled={uploading}
                  style={styles.submitBtn}
                >
                  {uploading ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Text style={styles.submitBtnText}>Save to Drive</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Preview Modal */}
      {previewDoc && (
        <Modal visible={!!previewDoc} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalBox, { backgroundColor: cardBg, maxHeight: '80%' }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: textColor }]} numberOfLines={1}>
                  {previewDoc.title}
                </Text>
                <TouchableOpacity onPress={() => setPreviewDoc(null)}>
                  <X size={20} color={textMuted} />
                </TouchableOpacity>
              </View>

              <View style={[styles.previewContainer, { backgroundColor: isDark ? '#152238' : '#F1F5F9' }]}>
                {previewDoc.thumbnailUrl ? (
                  <Image source={{ uri: previewDoc.thumbnailUrl }} style={styles.fullPreviewImg} resizeMode="contain" />
                ) : (
                  <View style={styles.centerLoading}>
                    <FileText size={48} color="#2563EB" />
                    <Text style={[styles.previewDocTitle, { color: textColor }]}>{previewDoc.title}</Text>
                    <Text style={{ fontSize: 11, color: textMuted }}>
                      {formatSize(previewDoc.fileSizeBytes)} • {previewDoc.mimeType}
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.previewActions}>
                <TouchableOpacity
                  onPress={() => {
                    if (previewDoc.driveViewUrl) Linking.openURL(previewDoc.driveViewUrl);
                  }}
                  style={styles.openDriveBtn}
                >
                  <ExternalLink size={14} color="#FFF" />
                  <Text style={styles.openDriveBtnText}>Open in Google Drive</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {docToDelete && (
        <Modal visible={!!docToDelete} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalBox, { backgroundColor: cardBg, maxWidth: 320, alignItems: 'center' }]}>
              <View style={styles.deleteCircle}>
                <Trash2 size={24} color="#EF4444" />
              </View>
              <Text style={[styles.deleteTitle, { color: textColor }]}>Delete Document?</Text>
              <Text style={[styles.deleteSub, { color: textMuted }]}>
                Are you sure you want to remove &quot;{docToDelete.title}&quot; from your locker?
              </Text>
              <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
                <TouchableOpacity onPress={() => setDocToDelete(null)} style={styles.cancelBtn}>
                  <Text style={[styles.cancelBtnText, { color: textMuted }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleDeleteDoc} style={styles.confirmDeleteBtn}>
                  <Text style={styles.confirmDeleteText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  headerSub: {
    fontSize: 10,
    marginTop: 1,
  },
  driveBadge: {
    backgroundColor: 'rgba(37,99,235,0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(37,99,235,0.2)',
  },
  driveBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#2563EB',
    textTransform: 'uppercase',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#2563EB',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  addBtnText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  scrollContent: {
    padding: 16,
    gap: 16,
  },
  statusCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
  },
  cloudIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusTitle: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  statusDesc: {
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
  },
  connectedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  connectedTagText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#059669',
    textTransform: 'uppercase',
  },
  connectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#2563EB',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  connectBtnText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  disconnectBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  disconnectBtnText: {
    color: '#EF4444',
    fontSize: 10,
    fontWeight: 'bold',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    paddingVertical: 0,
  },
  pillsRow: {
    gap: 8,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
  },
  pillText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  pillBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 6,
  },
  pillBadgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  centerLoading: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 12,
  },
  emptyBox: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 30,
    alignItems: 'center',
    textAlign: 'center',
  },
  emptyIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  emptySub: {
    fontSize: 11,
    marginTop: 4,
    textAlign: 'center',
    lineHeight: 16,
    maxWidth: 240,
  },
  emptyUploadBtn: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#2563EB',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 12,
  },
  emptyUploadBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  docsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  docCard: {
    width: (SCREEN_WIDTH - 44) / 2,
    borderRadius: 14,
    borderWidth: 1,
    padding: 10,
    justifyContent: 'space-between',
  },
  docCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  docTypeBadge: {
    backgroundColor: 'rgba(37,99,235,0.1)',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  docTypeBadgeText: {
    fontSize: 8,
    fontWeight: '900',
    color: '#2563EB',
    textTransform: 'uppercase',
  },
  docYearText: {
    fontSize: 9,
    fontWeight: 'bold',
  },
  docPreviewBox: {
    height: 90,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: 8,
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  previewFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  pdfLabel: {
    fontSize: 8,
    fontWeight: '900',
    color: '#EF4444',
    letterSpacing: 0.5,
  },
  docTitle: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  docExamName: {
    fontSize: 10,
    fontWeight: '700',
    color: '#2563EB',
    marginTop: 2,
  },
  docMeta: {
    fontSize: 9,
    marginTop: 2,
  },
  docActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    marginTop: 8,
    borderTopWidth: 1,
  },
  actionIconBtn: {
    padding: 4,
  },
  specsCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
  },
  specsTitle: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  specsGrid: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  specItem: {
    flex: 1,
    padding: 8,
    borderRadius: 8,
  },
  specItemHead: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#2563EB',
    marginBottom: 2,
  },
  specItemDesc: {
    fontSize: 8,
    lineHeight: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalBox: {
    width: '100%',
    borderRadius: 20,
    padding: 18,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  inputLabel: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  sourceButtonsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  sourceBtn: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: 'rgba(37,99,235,0.06)',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(37,99,235,0.15)',
  },
  sourceBtnText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  selectedFilePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 8,
    borderRadius: 8,
    marginBottom: 6,
  },
  selectedFileName: {
    fontSize: 11,
    fontWeight: 'bold',
    flex: 1,
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 12,
  },
  categoryPickerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  catOptionPill: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
  },
  catOptionText: {
    fontSize: 9,
    fontWeight: 'bold',
  },
  errorText: {
    fontSize: 11,
    color: '#EF4444',
    marginTop: 8,
  },
  progressBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    padding: 8,
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
  },
  progressText: {
    fontSize: 11,
    color: '#2563EB',
    fontWeight: '600',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 10,
    marginTop: 14,
  },
  cancelBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  cancelBtnText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  submitBtn: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 10,
  },
  submitBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  previewContainer: {
    height: 250,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginVertical: 12,
  },
  fullPreviewImg: {
    width: '100%',
    height: '100%',
  },
  previewDocTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 8,
    textAlign: 'center',
  },
  previewActions: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  openDriveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#2563EB',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 10,
  },
  openDriveBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  deleteCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  deleteTitle: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  deleteSub: {
    fontSize: 11,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 16,
  },
  confirmDeleteBtn: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  confirmDeleteText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
});
