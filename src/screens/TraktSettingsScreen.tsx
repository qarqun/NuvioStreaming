import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  SafeAreaView,
  ScrollView,
  StatusBar,
  Platform,
  Linking,
  Switch,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
// expo-auth-session not supported on tvOS - web browser authentication unavailable
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { traktService, TraktUser } from '../services/traktService';
import { useSettings } from '../hooks/useSettings';
import { logger } from '../utils/logger';
import TraktIcon from '../../assets/rating-icons/trakt.svg';
import { useTheme } from '../contexts/ThemeContext';
import { useTraktIntegration } from '../hooks/useTraktIntegration';
import { useTraktAutosyncSettings } from '../hooks/useTraktAutosyncSettings';
import { colors } from '../styles';

const ANDROID_STATUSBAR_HEIGHT = StatusBar.currentHeight || 0;

// Trakt configuration
const TRAKT_CLIENT_ID = 'd7271f7dd57d8aeff63e99408610091a6b1ceac3b3a541d1031a48f429b7942c';
const discovery = {
  authorizationEndpoint: 'https://trakt.tv/oauth/authorize',
  tokenEndpoint: 'https://api.trakt.tv/oauth/token',
};

// Trakt authentication not available on tvOS
// Web browser authentication is not supported on TV platforms

const TraktSettingsScreen: React.FC = () => {
  const { settings } = useSettings();
  const isDarkMode = settings.enableDarkMode;
  const navigation = useNavigation();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userProfile, setUserProfile] = useState<TraktUser | null>(null);
  const { currentTheme } = useTheme();
  
  const {
    settings: autosyncSettings,
    isSyncing,
    setAutosyncEnabled,
    performManualSync
  } = useTraktAutosyncSettings();

  const {
    isLoading: traktLoading,
    refreshAuthStatus
  } = useTraktIntegration();

  const [showSyncFrequencyModal, setShowSyncFrequencyModal] = useState(false);
  const [showThresholdModal, setShowThresholdModal] = useState(false);

  const checkAuthStatus = useCallback(async () => {
    setIsLoading(true);
    try {
      const authenticated = await traktService.isAuthenticated();
      setIsAuthenticated(authenticated);
      
      if (authenticated) {
        const profile = await traktService.getUserProfile();
        setUserProfile(profile);
      } else {
        setUserProfile(null);
      }
    } catch (error) {
      logger.error('[TraktSettingsScreen] Error checking auth status:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  // Trakt authentication not supported on tvOS
  // Web browser-based OAuth flow is not available on TV platforms
  const [isExchangingCode, setIsExchangingCode] = useState(false);
  
  // Placeholder for TV-compatible authentication
  const promptAsync = () => {
    Alert.alert(
      'Not Available on TV',
      'Trakt authentication requires a web browser which is not available on TV platforms. Please use the mobile version of the app to authenticate with Trakt.',
      [{ text: 'OK' }]
    );
  };

  // Auth response handling removed - not supported on tvOS
  // Web browser-based OAuth flow is not available on TV platforms

  const handleSignIn = () => {
    promptAsync(); // Trigger the authentication flow
  };

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out of your Trakt account?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Sign Out', 
          style: 'destructive',
          onPress: async () => {
            setIsLoading(true);
            try {
              await traktService.logout();
              setIsAuthenticated(false);
              setUserProfile(null);
            } catch (error) {
              logger.error('[TraktSettingsScreen] Error signing out:', error);
              Alert.alert('Error', 'Failed to sign out of Trakt.');
            } finally {
              setIsLoading(false);
            }
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={[
      styles.container,
      { backgroundColor: isDarkMode ? currentTheme.colors.darkBackground : '#F2F2F7' }
    ]}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <MaterialIcons 
            name="arrow-back" 
            size={24} 
            color={isDarkMode ? currentTheme.colors.highEmphasis : currentTheme.colors.textDark} 
          />
        </TouchableOpacity>
        <Text style={[
          styles.headerTitle,
          { color: isDarkMode ? currentTheme.colors.highEmphasis : currentTheme.colors.textDark}
        ]}>
          Trakt Settings
        </Text>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={[
          styles.card,
          { backgroundColor: isDarkMode ? currentTheme.colors.elevation2 : currentTheme.colors.white }
        ]}>
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={currentTheme.colors.primary} />
            </View>
          ) : isAuthenticated && userProfile ? (
            <View style={styles.profileContainer}>
              <View style={styles.profileHeader}>
                {userProfile.avatar ? (
                  <Image 
                    source={{ uri: userProfile.avatar }} 
                    style={styles.avatar}
                  />
                ) : (
                  <View style={[styles.avatarPlaceholder, { backgroundColor: currentTheme.colors.primary }]}>
                    <Text style={styles.avatarText}>
                      {userProfile.name?.charAt(0) || userProfile.username.charAt(0)}
                    </Text>
                  </View>
                )}
                <View style={styles.profileInfo}>
                  <Text style={[
                    styles.profileName,
                    { color: isDarkMode ? currentTheme.colors.highEmphasis : currentTheme.colors.textDark }
                  ]}>
                    {userProfile.name || userProfile.username}
                  </Text>
                  <Text style={[
                    styles.profileUsername,
                    { color: isDarkMode ? currentTheme.colors.mediumEmphasis : currentTheme.colors.textMutedDark }
                  ]}>
                    @{userProfile.username}
                  </Text>
                  {userProfile.vip && (
                    <View style={styles.vipBadge}>
                      <MaterialIcons name="star" size={14} color="#FFF" />
                      <Text style={styles.vipText}>VIP</Text>
                    </View>
                  )}
                </View>
              </View>

              <View style={styles.statsContainer}>
                <Text style={[
                  styles.joinedDate,
                  { color: isDarkMode ? currentTheme.colors.mediumEmphasis : currentTheme.colors.textMutedDark }
                ]}>
                  Joined {new Date(userProfile.joined_at).toLocaleDateString()}
                </Text>
              </View>

              <TouchableOpacity
                style={[
                  styles.button,
                  styles.signOutButton,
                  { backgroundColor: currentTheme.colors.error }
                ]}
                onPress={handleSignOut}
              >
                <Text style={styles.buttonText}>Sign Out</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.signInContainer}>
              <TraktIcon 
                width={120}
                height={120}
                style={styles.traktLogo}
              />
              <Text style={[
                styles.signInTitle,
                { color: isDarkMode ? currentTheme.colors.highEmphasis : currentTheme.colors.textDark }
              ]}>
                Connect with Trakt
              </Text>
              <Text style={[
                styles.signInDescription,
                { color: isDarkMode ? currentTheme.colors.mediumEmphasis : currentTheme.colors.textMutedDark }
              ]}>
                Sync your watch history, watchlist, and collection with Trakt.tv
              </Text>
              <TouchableOpacity
                style={[
                  styles.button,
                  { backgroundColor: isDarkMode ? currentTheme.colors.primary : currentTheme.colors.primary }
                ]}
                onPress={handleSignIn}
                disabled={isExchangingCode} // Disable while processing
              >
                {isExchangingCode ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={styles.buttonText}>
                    Sign In with Trakt
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>

        {isAuthenticated && (
          <View style={[
            styles.card,
            { backgroundColor: isDarkMode ? currentTheme.colors.elevation2 : currentTheme.colors.white }
          ]}>
            <View style={styles.settingsSection}>
              <Text style={[
                styles.sectionTitle,
                { color: isDarkMode ? currentTheme.colors.highEmphasis : currentTheme.colors.textDark }
              ]}>
                Sync Settings
              </Text>
              <View style={styles.settingItem}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View style={{ flex: 1 }}>
                <Text style={[
                  styles.settingLabel,
                  { color: isDarkMode ? currentTheme.colors.highEmphasis : currentTheme.colors.textDark }
                ]}>
                  Auto-sync playback progress
                </Text>
                <Text style={[
                  styles.settingDescription,
                  { color: isDarkMode ? currentTheme.colors.mediumEmphasis : currentTheme.colors.textMutedDark }
                ]}>
                      Automatically sync watch progress to Trakt
                </Text>
                  </View>
                  <Switch
                    value={autosyncSettings.enabled}
                    onValueChange={setAutosyncEnabled}
                    trackColor={{ 
                      false: isDarkMode ? 'rgba(120,120,128,0.3)' : 'rgba(120,120,128,0.2)',
                      true: currentTheme.colors.primary + '80'
                    }}
                    thumbColor={autosyncSettings.enabled ? currentTheme.colors.primary : (isDarkMode ? '#ffffff' : '#f4f3f4')}
                  />
                </View>
              </View>
              <View style={styles.settingItem}>
                <Text style={[
                  styles.settingLabel,
                  { color: isDarkMode ? currentTheme.colors.highEmphasis : currentTheme.colors.textDark }
                ]}>
                  Import watched history
                </Text>
                <Text style={[
                  styles.settingDescription,
                  { color: isDarkMode ? currentTheme.colors.mediumEmphasis : currentTheme.colors.textMutedDark }
                ]}>
                  Use "Sync Now" to import your watch history and progress from Trakt
                </Text>
              </View>
              <TouchableOpacity
                style={[
                  styles.button,
                  { 
                    backgroundColor: isDarkMode ? currentTheme.colors.primary + '40' : currentTheme.colors.primary + '20',
                    opacity: isSyncing ? 0.6 : 1
                  }
                ]}
                disabled={isSyncing}
                onPress={async () => {
                  const success = await performManualSync();
                  Alert.alert(
                    'Sync Complete',
                    success ? 'Successfully synced your watch progress with Trakt.' : 'Sync failed. Please try again.',
                    [{ text: 'OK' }]
                  );
                }}
              >
                {isSyncing ? (
                  <ActivityIndicator 
                    size="small" 
                    color={isDarkMode ? currentTheme.colors.primary : currentTheme.colors.primary} 
                  />
                ) : (
                  <Text style={[
                    styles.buttonText,
                    { color: isDarkMode ? currentTheme.colors.primary : currentTheme.colors.primary }
                  ]}>
                    Sync Now
                  </Text>
                )}
              </TouchableOpacity>


            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingTop: Platform.OS === 'android' ? ANDROID_STATUSBAR_HEIGHT + 16 : 16,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '600',
    marginLeft: 16,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  card: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signInContainer: {
    padding: 24,
    alignItems: 'center',
  },
  traktLogo: {
    width: 120,
    height: 120,
    marginBottom: 20,
  },
  signInTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  signInDescription: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  button: {
    width: '100%',
    height: 44,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  signOutButton: {
    marginTop: 20,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '500',
    color: 'white',
  },
  profileContainer: {
    padding: 20,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  avatarPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 26,
    fontWeight: 'bold',
    color: 'white',
  },
  profileInfo: {
    marginLeft: 16,
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  profileUsername: {
    fontSize: 14,
  },
  vipBadge: {
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: '#FFD700',
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  vipText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#000',
  },
  statsContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(150,150,150,0.2)',
  },
  joinedDate: {
    fontSize: 14,
  },
  settingsSection: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  settingItem: {
    marginBottom: 16,
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
  },
});

export default TraktSettingsScreen;