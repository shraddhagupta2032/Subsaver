import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { groupsApi } from '../../api/groups';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { colors } from '../../theme/colors';

export const GroupsScreen = ({ navigation }) => {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;

  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Create Group Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState(null);

  const fetchGroups = useCallback(async () => {
    try {
      setError(null);
      const data = await groupsApi.getGroups();
      setGroups(data || []);
    } catch (err) {
      console.warn('fetchGroups error:', err);
      setError(err.message || 'Failed to load groups.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchGroups();
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) {
      setCreateError('Please enter a group name.');
      return;
    }

    try {
      setCreating(true);
      setCreateError(null);
      const created = await groupsApi.createGroup(newGroupName.trim());
      setNewGroupName('');
      setModalVisible(false);
      fetchGroups();
      navigation.navigate('GroupDetails', {
        groupId: created.id,
        groupName: created.name,
      });
    } catch (err) {
      setCreateError(err.message || 'Failed to create group.');
    } finally {
      setCreating(false);
    }
  };

  const getGroupIcon = (name = '') => {
    const n = name.toLowerCase();
    if (n.includes('flat') || n.includes('room') || n.includes('home') || n.includes('house')) {
      return { icon: 'home-outline', color: colors.primary };
    }
    if (n.includes('trip') || n.includes('goa') || n.includes('travel') || n.includes('tour')) {
      return { icon: 'airplane-outline', color: colors.info };
    }
    if (n.includes('project') || n.includes('work') || n.includes('crew') || n.includes('office')) {
      return { icon: 'laptop-outline', color: colors.purple };
    }
    return { icon: 'people-outline', color: colors.primary };
  };

  const renderGroupItem = ({ item }) => {
    const iconConf = getGroupIcon(item.name);
    return (
      <TouchableOpacity
        activeOpacity={0.75}
        style={styles.groupCard}
        onPress={() =>
          navigation.navigate('GroupDetails', {
            groupId: item.id,
            groupName: item.name,
          })
        }
      >
        <View style={[styles.groupIconBox, { backgroundColor: `${iconConf.color}15` }]}>
          <Ionicons name={iconConf.icon} size={22} color={iconConf.color} />
        </View>

        <View style={styles.groupInfo}>
          <Text style={styles.groupName} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.groupSubtext} numberOfLines={1}>
            {item.members_count} member{item.members_count === 1 ? '' : 's'}
          </Text>
        </View>

        <View style={styles.groupRight}>
          <Badge
            text={item.status_badge || 'Active'}
            variant={item.status_badge === 'Owed' ? 'danger' : 'success'}
            size="small"
          />
          <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} style={{ marginTop: 4 }} />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Top Header */}
      <View style={[styles.header, { maxWidth: isDesktop ? 1140 : '100%' }]}>
        <View style={styles.headerTitleCol}>
          <Text style={styles.headerTitle}>Your groups</Text>
          <Text style={styles.headerSubtitle}>Share costs, not confusion.</Text>
        </View>
        <TouchableOpacity
          style={styles.addButtonCircle}
          onPress={() => {
            setCreateError(null);
            setModalVisible(true);
          }}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {error && (
        <View style={[styles.errorBox, { maxWidth: isDesktop ? 1140 : '100%' }]}>
          <Ionicons name="alert-circle-outline" size={18} color={colors.danger} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading groups...</Text>
        </View>
      ) : (
        <FlatList
          data={groups}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderGroupItem}
          contentContainerStyle={[
            styles.listContent,
            { maxWidth: isDesktop ? 1140 : '100%', paddingHorizontal: isDesktop ? 24 : 16 },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="people-outline" size={32} color={colors.primary} />
              </View>
              <Text style={styles.emptyTitle}>No Groups Yet</Text>
              <Text style={styles.emptySubtitle}>
                Create a group for flatmates, trips, or dining splits to start sharing expenses seamlessly.
              </Text>
              <Button
                title="Create First Group"
                onPress={() => setModalVisible(true)}
                style={{ height: 44, paddingHorizontal: 20 }}
              />
            </View>
          }
        />
      )}

      {/* Create Group Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create New Group</Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSub}>
              Enter a descriptive name for your flat, trip, or crew.
            </Text>

            {createError && (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle-outline" size={16} color={colors.danger} />
                <Text style={styles.errorText}>{createError}</Text>
              </View>
            )}

            <Input
              label="Group Name"
              value={newGroupName}
              onChangeText={setNewGroupName}
              placeholder="e.g. Flatmates, Goa Trip, Friday Dinners"
              autoFocus
            />

            <View style={styles.modalActions}>
              <Button
                title="Cancel"
                variant="outline"
                onPress={() => setModalVisible(false)}
                style={styles.modalBtn}
              />
              <Button
                title="Create Group"
                onPress={handleCreateGroup}
                loading={creating}
                style={styles.modalBtn}
              />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
    width: '100%',
    alignSelf: 'center',
  },
  headerTitleCol: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
    fontWeight: '500',
  },
  addButtonCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  listContent: {
    paddingTop: 10,
    paddingBottom: 110,
    width: '100%',
    alignSelf: 'center',
  },
  groupCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#183129',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  groupIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  groupInfo: {
    flex: 1,
  },
  groupName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
  },
  groupSubtext: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  groupRight: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.dangerBg,
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 20,
    marginBottom: 12,
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
    marginLeft: 8,
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: 14,
    marginTop: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
    backgroundColor: colors.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 10,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 20,
    maxWidth: 320,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(22, 32, 29, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    padding: 24,
    width: '100%',
    maxWidth: 420,
    shadowColor: '#183129',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  modalSub: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 18,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalBtn: {
    flex: 1,
    height: 46,
  },
});
