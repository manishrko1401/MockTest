import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StatusBar
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Database, HardDrive, Cpu, RefreshCw, BarChart2, Hash } from 'lucide-react-native';
import { ApiClient } from '../api';
import { ThemeColors } from '../theme';

interface AdminAnalyticsScreenProps {
  onBack: () => void;
  isDark?: boolean;
}

export default function AdminAnalyticsScreen({ onBack, isDark = true }: AdminAnalyticsScreenProps) {
  const insets = useSafeAreaInsets();
  const theme = isDark ? ThemeColors.dark : ThemeColors.light;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<any>(null);

  const loadStats = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);

    try {
      const res = await ApiClient.dbStats();
      if (res.success) {
        setStats(res);
      }
    } catch (e) {
      console.warn("Failed to load db-stats:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const renderStatsCard = (title: string, value: string | number, subtitle: string, icon: React.ReactNode, color: string) => {
    return (
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.cardHeader}>
          <Text style={[styles.cardLabel, { color: theme.textMuted }]}>{title}</Text>
          <View style={[styles.iconWrapper, { backgroundColor: `${color}15` }]}>
            {icon}
          </View>
        </View>
        <Text style={[styles.cardValue, { color: theme.text }]}>{value}</Text>
        <Text style={[styles.cardSubtitle, { color: theme.textMuted }]}>{subtitle}</Text>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <StatusBar barStyle="light-content" backgroundColor={theme.headerBg} />
      
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.headerBg, borderBottomColor: theme.border, height: 56 + insets.top, paddingTop: insets.top }]}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <ArrowLeft color={theme.headerText} size={24} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={[styles.headerTitle, { color: theme.headerText }]}>Database Analytics</Text>
          <Text style={styles.headerSubtitle}>PostgreSQL Engine Telemetry</Text>
        </View>
        <TouchableOpacity onPress={() => loadStats(false)} style={styles.refreshBtn}>
          <RefreshCw color={theme.headerText} size={18} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.textMuted }]}>Quering PostgreSQL stats...</Text>
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => loadStats(true)} tintColor={theme.primary} />
          }
        >
          {stats ? (
            <View>
              {/* Stats Grid */}
              <View style={styles.grid}>
                {renderStatsCard(
                  'Database Size',
                  `${stats.dbSizeMB || 0} MB`,
                  'Total space allocated',
                  <HardDrive size={18} color={theme.primary} />,
                  theme.primary
                )}
                {renderStatsCard(
                  'Active Connections',
                  stats.connectionCount ?? 0,
                  'Active TCP sockets',
                  <Cpu size={18} color={theme.accentGreen} />,
                  theme.accentGreen
                )}
                {renderStatsCard(
                  'Total Rows Registered',
                  (stats.totalRows ?? 0).toLocaleString(),
                  'Aggregated across all tables',
                  <Hash size={18} color={theme.accentAmber} />,
                  theme.accentAmber
                )}
                {renderStatsCard(
                  'Database Version',
                  `v${stats.pgVersion || '15'}`,
                  'Postgres engine build',
                  <Database size={18} color="#D97706" />,
                  '#D97706'
                )}
              </View>

              {/* Allocation list breakdown */}
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Table Allocations</Text>
              
              <View style={[styles.tableCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                {stats.tables && stats.tables.map((t: any, idx: number) => {
                  const maxBytes = Math.max(...stats.tables.map((tbl: any) => Number(tbl.sizeBytes || 0)));
                  const ratio = maxBytes > 0 ? Number(t.sizeBytes || 0) / maxBytes : 0;
                  
                  return (
                    <View key={t.tableName} style={[styles.tableRow, idx > 0 && { borderTopColor: theme.border }]}>
                      <View style={styles.tableRowHeader}>
                        <Text style={[styles.tableName, { color: theme.text }]}>{t.tableName}</Text>
                        <Text style={[styles.tableSize, { color: theme.text }]}>{t.sizePretty || '0 bytes'}</Text>
                      </View>
                      
                      {/* Allocation Ratio Bar */}
                      <View style={[styles.ratioTrack, { backgroundColor: theme.inputBg }]}>
                        <View style={[styles.ratioFill, { width: `${ratio * 100}%`, backgroundColor: theme.primary }]} />
                      </View>

                      <View style={styles.tableRowFooter}>
                        <Text style={[styles.tableRowsCount, { color: theme.textMuted }]}>
                          Rows: {Number(t.rowCount ?? 0).toLocaleString()}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          ) : (
            <View style={styles.errorContainer}>
              <BarChart2 size={48} color={theme.textMuted} />
              <Text style={[styles.errorText, { color: theme.textMuted }]}>No analytics data available.</Text>
            </View>
          )}
        </ScrollView>
      )}
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
  refreshBtn: {
    padding: 6,
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
  scrollContent: {
    padding: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  card: {
    width: '48%',
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  cardLabel: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    flex: 1,
  },
  iconWrapper: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardValue: {
    fontSize: 20,
    fontWeight: 'bold',
    marginVertical: 4,
  },
  cardSubtitle: {
    fontSize: 11,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 8,
    marginBottom: 12,
  },
  tableCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  tableRow: {
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  tableRowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  tableName: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  tableSize: {
    fontSize: 13,
    fontWeight: '600',
  },
  ratioTrack: {
    height: 6,
    borderRadius: 3,
    width: '100%',
    marginVertical: 4,
  },
  ratioFill: {
    height: '100%',
    borderRadius: 3,
  },
  tableRowFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginTop: 4,
  },
  tableRowsCount: {
    fontSize: 11,
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  errorText: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 12,
  },
});
