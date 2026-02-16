import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { NavigationProp, useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RootStackParamList } from '../navigation/AppNavigator';
import ScreenHeader from '../components/common/ScreenHeader';
import { useTheme } from '../contexts/ThemeContext';
import CustomAlert from '../components/CustomAlert';
import { supabaseSyncService, SupabaseUser, LinkedDevice } from '../services/supabaseSyncService';
import { useAccount } from '../contexts/AccountContext';

const SyncSettingsScreen: React.FC = () => {
  const { currentTheme } = useTheme();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const { user, signOut } = useAccount();

  const [loading, setLoading] = useState(false);
  const [syncCodeLoading, setSyncCodeLoading] = useState(false);
  const [sessionUser, setSessionUser] = useState<SupabaseUser | null>(null);
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [linkedDevices, setLinkedDevices] = useState<LinkedDevice[]>([]);
  const [lastCode, setLastCode] = useState<string>('');
  const [pin, setPin] = useState('');
  const [claimCode, setClaimCode] = useState('');
  const [claimPin, setClaimPin] = useState('');
  const [deviceName, setDeviceName] = useState('');

  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [alertActions, setAlertActions] = useState<Array<{ label: string; onPress: () => void; style?: object }>>([]);

  const openAlert = useCallback(
    (title: string, message: string, actions?: Array<{ label: string; onPress: () => void; style?: object }>) => {
      setAlertTitle(title);
      setAlertMessage(message);
      setAlertActions(actions && actions.length > 0 ? actions : [{ label: 'OK', onPress: () => {} }]);
      setAlertVisible(true);
    },
    []
  );

  const loadSyncState = useCallback(async () => {
    setLoading(true);
    try {
      await supabaseSyncService.initialize();
      setSessionUser(supabaseSyncService.getCurrentSessionUser());
      const owner = await supabaseSyncService.getEffectiveOwnerId();
      setOwnerId(owner);
      const devices = await supabaseSyncService.getLinkedDevices();
      setLinkedDevices(devices);
    } catch (error: any) {
      openAlert('Sync Error', error?.message || 'Failed to load sync state');
    } finally {
      setLoading(false);
    }
  }, [openAlert]);

  useFocusEffect(
    useCallback(() => {
      loadSyncState();
    }, [loadSyncState])
  );

  const authLabel = useMemo(() => {
    if (!supabaseSyncService.isConfigured()) return 'Supabase not configured';
    if (!sessionUser) return 'Not authenticated';
    return `Email session${sessionUser.email ? ` (${sessionUser.email})` : ''}`;
  }, [sessionUser]);

  const handleGenerateCode = async () => {
    if (!pin.trim()) {
      openAlert('PIN Required', 'Enter a PIN before generating a sync code.');
      return;
    }
    setSyncCodeLoading(true);
    try {
      const result = await supabaseSyncService.generateSyncCode(pin.trim());
      if (result.error || !result.code) {
        openAlert('Generate Failed', result.error || 'Unable to generate sync code');
      } else {
        setLastCode(result.code);
        openAlert('Sync Code Ready', `Code: ${result.code}`);
        await loadSyncState();
      }
    } finally {
      setSyncCodeLoading(false);
    }
  };

  const handleGetCode = async () => {
    if (!pin.trim()) {
      openAlert('PIN Required', 'Enter your PIN to retrieve the current sync code.');
      return;
    }
    setSyncCodeLoading(true);
    try {
      const result = await supabaseSyncService.getSyncCode(pin.trim());
      if (result.error || !result.code) {
        openAlert('Fetch Failed', result.error || 'Unable to fetch sync code');
      } else {
        setLastCode(result.code);
        openAlert('Current Sync Code', `Code: ${result.code}`);
      }
    } finally {
      setSyncCodeLoading(false);
    }
  };

  const handleClaimCode = async () => {
    if (!claimCode.trim() || !claimPin.trim()) {
      openAlert('Missing Details', 'Enter both sync code and PIN to claim.');
      return;
    }
    setSyncCodeLoading(true);
    try {
      const result = await supabaseSyncService.claimSyncCode(
        claimCode.trim().toUpperCase(),
        claimPin.trim(),
        deviceName.trim() || undefined
      );
      if (!result.success) {
        openAlert('Claim Failed', result.message);
      } else {
        openAlert('Device Linked', result.message);
        setClaimCode('');
        setClaimPin('');
        await loadSyncState();
      }
    } finally {
      setSyncCodeLoading(false);
    }
  };

  const handleManualSync = async () => {
    setSyncCodeLoading(true);
    try {
      await supabaseSyncService.syncNow();
      openAlert('Sync Complete', 'Manual sync completed successfully.');
      await loadSyncState();
    } catch (error: any) {
      openAlert('Sync Failed', error?.message || 'Manual sync failed');
    } finally {
      setSyncCodeLoading(false);
    }
  };

  const handleUnlinkDevice = (deviceUserId: string) => {
    openAlert('Unlink Device', 'Are you sure you want to unlink this device?', [
      { label: 'Cancel', onPress: () => {} },
      {
        label: 'Unlink',
        onPress: async () => {
          setSyncCodeLoading(true);
          try {
            const result = await supabaseSyncService.unlinkDevice(deviceUserId);
            if (!result.success) {
              openAlert('Unlink Failed', result.error || 'Unable to unlink device');
            } else {
              await loadSyncState();
            }
          } finally {
            setSyncCodeLoading(false);
          }
        },
      },
    ]);
  };

  const handleSignOut = async () => {
    setSyncCodeLoading(true);
    try {
      await signOut();
      await loadSyncState();
    } catch (error: any) {
      openAlert('Sign Out Failed', error?.message || 'Failed to sign out');
    } finally {
      setSyncCodeLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: currentTheme.colors.darkBackground }]}>
        <StatusBar barStyle="light-content" />
        <ScreenHeader title="Nuvio Sync" showBackButton onBackPress={() => navigation.goBack()} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={currentTheme.colors.primary} size="large" />
        </View>
      </View>
    );
  }

  return (
      <View style={[styles.container, { backgroundColor: currentTheme.colors.darkBackground }]}>
      <StatusBar barStyle="light-content" />
      <ScreenHeader title="Nuvio Sync" showBackButton onBackPress={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}>
        <View style={[styles.card, { backgroundColor: currentTheme.colors.elevation1, borderColor: currentTheme.colors.elevation2 }]}>
          <Text style={[styles.cardTitle, { color: currentTheme.colors.highEmphasis }]}>Account</Text>
          <Text style={[styles.cardText, { color: currentTheme.colors.mediumEmphasis }]}>
            {user?.email ? `Signed in as ${user.email}` : 'Not signed in'}
          </Text>
          <View style={styles.buttonRow}>
            {!user ? (
              <TouchableOpacity
                style={[styles.button, { backgroundColor: currentTheme.colors.primary }]}
                onPress={() => navigation.navigate('Account')}
              >
                <Text style={styles.buttonText}>Sign In / Sign Up</Text>
              </TouchableOpacity>
            ) : (
              <>
                <TouchableOpacity
                  style={[styles.button, { backgroundColor: currentTheme.colors.primary }]}
                  onPress={() => navigation.navigate('AccountManage')}
                >
                  <Text style={styles.buttonText}>Manage Account</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  disabled={syncCodeLoading}
                  style={[styles.button, { backgroundColor: currentTheme.colors.elevation2 }]}
                  onPress={handleSignOut}
                >
                  <Text style={styles.buttonText}>Sign Out</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: currentTheme.colors.elevation1, borderColor: currentTheme.colors.elevation2 }]}>
          <Text style={[styles.cardTitle, { color: currentTheme.colors.highEmphasis }]}>Connection Status</Text>
          <Text style={[styles.cardText, { color: currentTheme.colors.mediumEmphasis }]}>{authLabel}</Text>
          <Text style={[styles.cardText, { color: currentTheme.colors.mediumEmphasis }]}>
            Effective owner: {ownerId || 'Unavailable'}
          </Text>
          {!supabaseSyncService.isConfigured() && (
            <Text style={[styles.warning, { color: '#ffb454' }]}>
              Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to enable sync.
            </Text>
          )}
        </View>

        <View style={[styles.card, { backgroundColor: currentTheme.colors.elevation1, borderColor: currentTheme.colors.elevation2 }]}>
          <Text style={[styles.cardTitle, { color: currentTheme.colors.highEmphasis }]}>Sync Code</Text>
          <TextInput
            value={pin}
            onChangeText={setPin}
            placeholder="PIN"
            placeholderTextColor={currentTheme.colors.mediumEmphasis}
            style={[styles.input, { color: currentTheme.colors.white, borderColor: currentTheme.colors.elevation2 }]}
            secureTextEntry
          />
          {!!lastCode && (
            <Text style={[styles.codeText, { color: currentTheme.colors.primary }]}>
              Latest code: {lastCode}
            </Text>
          )}
          <View style={styles.buttonRow}>
            <TouchableOpacity
              disabled={syncCodeLoading || !supabaseSyncService.isConfigured()}
              style={[styles.button, { backgroundColor: currentTheme.colors.primary }]}
              onPress={handleGenerateCode}
            >
              <Text style={styles.buttonText}>Generate Code</Text>
            </TouchableOpacity>
            <TouchableOpacity
              disabled={syncCodeLoading || !supabaseSyncService.isConfigured()}
              style={[styles.button, { backgroundColor: currentTheme.colors.elevation2 }]}
              onPress={handleGetCode}
            >
              <Text style={styles.buttonText}>Get Existing Code</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: currentTheme.colors.elevation1, borderColor: currentTheme.colors.elevation2 }]}>
          <Text style={[styles.cardTitle, { color: currentTheme.colors.highEmphasis }]}>Claim Sync Code</Text>
          <TextInput
            value={claimCode}
            onChangeText={setClaimCode}
            placeholder="SYNC-CODE"
            autoCapitalize="characters"
            placeholderTextColor={currentTheme.colors.mediumEmphasis}
            style={[styles.input, { color: currentTheme.colors.white, borderColor: currentTheme.colors.elevation2 }]}
          />
          <TextInput
            value={claimPin}
            onChangeText={setClaimPin}
            placeholder="PIN"
            secureTextEntry
            placeholderTextColor={currentTheme.colors.mediumEmphasis}
            style={[styles.input, { color: currentTheme.colors.white, borderColor: currentTheme.colors.elevation2 }]}
          />
          <TextInput
            value={deviceName}
            onChangeText={setDeviceName}
            placeholder="Device name (optional)"
            placeholderTextColor={currentTheme.colors.mediumEmphasis}
            style={[styles.input, { color: currentTheme.colors.white, borderColor: currentTheme.colors.elevation2 }]}
          />
          <TouchableOpacity
            disabled={syncCodeLoading || !supabaseSyncService.isConfigured()}
            style={[styles.button, { backgroundColor: currentTheme.colors.primary }]}
            onPress={handleClaimCode}
          >
            <Text style={styles.buttonText}>Claim Code</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.card, { backgroundColor: currentTheme.colors.elevation1, borderColor: currentTheme.colors.elevation2 }]}>
          <Text style={[styles.cardTitle, { color: currentTheme.colors.highEmphasis }]}>Linked Devices</Text>
          {linkedDevices.length === 0 && (
            <Text style={[styles.cardText, { color: currentTheme.colors.mediumEmphasis }]}>No linked devices.</Text>
          )}
          {linkedDevices.map((device) => (
            <View key={`${device.owner_id}:${device.device_user_id}`} style={styles.deviceRow}>
              <View style={styles.deviceInfo}>
                <Text style={[styles.deviceName, { color: currentTheme.colors.highEmphasis }]}>
                  {device.device_name || 'Unnamed device'}
                </Text>
                <Text style={[styles.deviceMeta, { color: currentTheme.colors.mediumEmphasis }]}>
                  {device.device_user_id}
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.unlinkButton, { borderColor: currentTheme.colors.elevation2 }]}
                onPress={() => handleUnlinkDevice(device.device_user_id)}
              >
                <Text style={[styles.unlinkText, { color: currentTheme.colors.white }]}>Unlink</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        <TouchableOpacity
          disabled={syncCodeLoading || !supabaseSyncService.isConfigured()}
          style={[styles.syncNowButton, { backgroundColor: currentTheme.colors.primary }]}
          onPress={handleManualSync}
        >
          {syncCodeLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Sync Now</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      <CustomAlert
        visible={alertVisible}
        title={alertTitle}
        message={alertMessage}
        actions={alertActions}
        onClose={() => setAlertVisible(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: 16,
    gap: 16,
  },
  card: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    gap: 10,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  cardText: {
    fontSize: 13,
    lineHeight: 18,
  },
  warning: {
    fontSize: 12,
    marginTop: 4,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  button: {
    flex: 1,
    borderRadius: 10,
    minHeight: 42,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  codeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  deviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 6,
  },
  deviceInfo: {
    flex: 1,
  },
  deviceName: {
    fontSize: 14,
    fontWeight: '600',
  },
  deviceMeta: {
    fontSize: 12,
    marginTop: 2,
  },
  unlinkButton: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  unlinkText: {
    fontSize: 12,
    fontWeight: '700',
  },
  syncNowButton: {
    minHeight: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default SyncSettingsScreen;
