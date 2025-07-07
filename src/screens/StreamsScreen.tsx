import React, { useCallback, useMemo, memo, useState, useEffect, useRef, useLayoutEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  SectionList,
  Platform,
  ImageBackground,
  ScrollView,
  StatusBar,
  Alert,
  Dimensions,
  Linking,
} from 'react-native';
import * as ScreenOrientation from 'expo-screen-orientation';
import { useRoute, useNavigation } from '@react-navigation/native';
import { RouteProp } from '@react-navigation/native';
import { NavigationProp } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { RootStackParamList, RootStackNavigationProp } from '../navigation/AppNavigator';
import { useMetadata } from '../hooks/useMetadata';
import { useMetadataAssets } from '../hooks/useMetadataAssets';
import { useTheme } from '../contexts/ThemeContext';
import { Stream } from '../types/metadata';
import { tmdbService } from '../services/tmdbService';
import { stremioService } from '../services/stremioService';
import { VideoPlayerService } from '../services/videoPlayerService';
import { useSettings } from '../hooks/useSettings';
import QualityBadge from '../components/metadata/QualityBadge';
import Animated, {
  FadeIn,
  FadeOut,
  FadeInDown,
  SlideInDown,
  withSpring,
  withTiming,
  useAnimatedStyle,
  useSharedValue,
  interpolate,
  Extrapolate,
  runOnJS,
  cancelAnimation,
  SharedValue,
  Layout
} from 'react-native-reanimated';
import { logger } from '../utils/logger';

const TMDB_LOGO = 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/89/Tmdb.new.logo.svg/512px-Tmdb.new.logo.svg.png?20200406190906';
const HDR_ICON = 'https://uxwing.com/wp-content/themes/uxwing/download/video-photography-multimedia/hdr-icon.png';
const DOLBY_ICON = 'https://upload.wikimedia.org/wikipedia/en/thumb/3/3f/Dolby_Vision_%28logo%29.svg/512px-Dolby_Vision_%28logo%29.svg.png?20220908042900';

const { width, height } = Dimensions.get('window');

// Extracted Components
const StreamCard = memo(({ stream, onPress, index, isLoading, statusMessage, theme }: { 
  stream: Stream; 
  onPress: () => void; 
  index: number;
  isLoading?: boolean;
  statusMessage?: string;
  theme: any;
}) => {
  const styles = React.useMemo(() => createStyles(theme.colors), [theme.colors]);
  
  const streamInfo = useMemo(() => {
    const title = stream.title || '';
    const name = stream.name || '';
    return {
      quality: title.match(/(\d+)p/)?.[1] || null,
      isHDR: title.toLowerCase().includes('hdr'),
      isDolby: title.toLowerCase().includes('dolby') || title.includes('DV'),
      size: title.match(/💾\s*([\d.]+\s*[GM]B)/)?.[1],
      isDebrid: stream.behaviorHints?.cached,
      displayName: name || title || 'Unnamed Stream',
      subTitle: title && title !== name ? title : null
    };
  }, [stream.name, stream.title, stream.behaviorHints]);
  
  // Animation delay based on index - stagger effect
  const enterDelay = 100 + (index * 30);

  return (
    <Animated.View
      entering={FadeInDown.duration(200).delay(enterDelay)}
      exiting={FadeOut.duration(150)}
    >
      <TouchableOpacity 
        style={[
          styles.streamCard, 
          isLoading && styles.streamCardLoading
        ]} 
        onPress={onPress}
        disabled={isLoading}
        activeOpacity={0.7}
      >
        <View style={styles.streamDetails}>
          <View style={styles.streamNameRow}>
            <View style={styles.streamTitleContainer}>
              <Text style={[styles.streamName, { color: theme.colors.highEmphasis }]}>
                {streamInfo.displayName}
              </Text>
              {streamInfo.subTitle && (
                <Text style={[styles.streamAddonName, { color: theme.colors.mediumEmphasis }]}>
                  {streamInfo.subTitle}
                </Text>
              )}
            </View>
            
            {/* Show loading indicator if stream is loading */}
            {isLoading && (
              <View style={styles.loadingIndicator}>
                <ActivityIndicator size="small" color={theme.colors.primary} />
                <Text style={[styles.loadingText, { color: theme.colors.primary }]}>
                  {statusMessage || "Loading..."}
                </Text>
              </View>
            )}
          </View>
          
          <View style={styles.streamMetaRow}>
            {streamInfo.quality && streamInfo.quality >= "720" && (
              <QualityBadge type="HD" />
            )}
            
            {streamInfo.isDolby && (
              <QualityBadge type="VISION" />
            )}
            
            {streamInfo.size && (
              <View style={[styles.chip, { backgroundColor: theme.colors.darkGray }]}>
                <Text style={[styles.chipText, { color: theme.colors.white }]}>{streamInfo.size}</Text>
              </View>
            )}
            
            {streamInfo.isDebrid && (
              <View style={[styles.chip, { backgroundColor: theme.colors.success }]}>
                <Text style={[styles.chipText, { color: theme.colors.white }]}>DEBRID</Text>
              </View>
            )}
          </View>
        </View>
        
        <View style={styles.streamAction}>
          <MaterialIcons 
            name="play-arrow" 
            size={24} 
            color={theme.colors.primary} 
          />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
});

const QualityTag = React.memo(({ text, color, theme }: { text: string; color: string; theme: any }) => {
  const styles = React.useMemo(() => createStyles(theme.colors), [theme.colors]);
  
  return (
    <View style={[styles.chip, { backgroundColor: color }]}>
      <Text style={styles.chipText}>{text}</Text>
    </View>
  );
});

const ProviderFilter = memo(({ 
  selectedProvider, 
  providers, 
  onSelect,
  theme
}: { 
  selectedProvider: string; 
  providers: Array<{ id: string; name: string; }>; 
  onSelect: (id: string) => void;
  theme: any;
}) => {
  const styles = React.useMemo(() => createStyles(theme.colors), [theme.colors]);
  
  const renderItem = useCallback(({ item, index }: { item: { id: string; name: string }; index: number }) => (
    <Animated.View
      entering={FadeIn.duration(300).delay(100 + index * 40)}
      exiting={FadeOut.duration(150)}
    >
      <TouchableOpacity
        key={item.id}
        style={[
          styles.filterChip,
          selectedProvider === item.id && styles.filterChipSelected
        ]}
        onPress={() => onSelect(item.id)}
      >
        <Text style={[
          styles.filterChipText,
          selectedProvider === item.id && styles.filterChipTextSelected
        ]}>
          {item.name}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  ), [selectedProvider, onSelect, styles]);

  return (
    <Animated.View
      entering={FadeIn.duration(300)}
    >
      <FlatList
        data={providers}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        bounces={true}
        overScrollMode="never"
        decelerationRate="fast"
        initialNumToRender={5}
        maxToRenderPerBatch={3}
        windowSize={3}
        getItemLayout={(data, index) => ({
          length: 100, // Approximate width of each item
          offset: 100 * index,
          index,
        })}
      />
    </Animated.View>
  );
});

export const StreamsScreen = () => {
  const route = useRoute<RouteProp<RootStackParamList, 'Streams'>>();
  const navigation = useNavigation<RootStackNavigationProp>();
  const { id, type, episodeId, episodeThumbnail } = route.params;
  const { settings } = useSettings();
  const { currentTheme } = useTheme();
  const { colors } = currentTheme;

  // Add ref to prevent excessive updates
  const isMounted = useRef(true);
  const loadStartTimeRef = useRef(0);
  const hasDoneInitialLoadRef = useRef(false);
  
  

  // Track when we started fetching streams so we can show an extended loading state
  const [streamsLoadStart, setStreamsLoadStart] = useState<number | null>(null);
  const [providerLoadTimes, setProviderLoadTimes] = useState<{[key: string]: number}>({});
  
  // Prevent excessive re-renders by using this guard
  const guardedSetState = useCallback((setter: () => void) => {
    if (isMounted.current) {
      setter();
    }
  }, []);

  useEffect(() => {
    console.log('[StreamsScreen] Received thumbnail from params:', episodeThumbnail);
  }, [episodeThumbnail]);

  const {
    metadata,
    episodes,
    groupedStreams,
    loadingStreams,
    episodeStreams,
    loadingEpisodeStreams,
    selectedEpisode,
    loadStreams,
    loadEpisodeStreams,
    setSelectedEpisode,
    groupedEpisodes,
    imdbId,
  } = useMetadata({ id, type });

  // Get backdrop from metadata assets
  const setMetadataStub = useCallback(() => {}, []);
  const memoizedSettings = useMemo(() => settings, [settings.logoSourcePreference, settings.tmdbLanguagePreference]);
  const { bannerImage } = useMetadataAssets(metadata, id, type, imdbId, memoizedSettings, setMetadataStub);

  // Create styles using current theme colors
  const styles = React.useMemo(() => createStyles(colors), [colors]);

  const [selectedProvider, setSelectedProvider] = React.useState('all');
  const [availableProviders, setAvailableProviders] = React.useState<Set<string>>(new Set());

  // Optimize animation values with cleanup
  const headerOpacity = useSharedValue(0);
  const heroScale = useSharedValue(0.95);
  const filterOpacity = useSharedValue(0);

  // Add state for provider loading status
  const [loadingProviders, setLoadingProviders] = useState<{[key: string]: boolean}>({});
  
  // Add state for more detailed provider loading tracking
  const [providerStatus, setProviderStatus] = useState<{
    [key: string]: {
      loading: boolean;
      success: boolean;
      error: boolean;
      message: string;
      timeStarted: number;
      timeCompleted: number;
    }
  }>({});

  // Add state for autoplay functionality
  const [autoplayTriggered, setAutoplayTriggered] = useState(false);
  const [isAutoplayWaiting, setIsAutoplayWaiting] = useState(false);

  // Add check for available streaming sources
  const [hasStreamProviders, setHasStreamProviders] = useState(true); // Assume true initially
  const [hasStremioStreamProviders, setHasStremioStreamProviders] = useState(true); // For footer logic

  // Add state for no sources error
  const [showNoSourcesError, setShowNoSourcesError] = useState(false);

  // Monitor streams loading and update available providers immediately
  useEffect(() => {
    // Skip processing if component is unmounting
    if (!isMounted.current) return;
    
    const currentStreamsData = type === 'series' ? episodeStreams : groupedStreams;
    
    // Update available providers immediately when streams change
    const providersWithStreams = Object.entries(currentStreamsData)
      .filter(([_, data]) => data.streams && data.streams.length > 0)
      .map(([providerId]) => providerId);
    
    if (providersWithStreams.length > 0) {
      logger.log(`📊 Providers with streams: ${providersWithStreams.join(', ')}`);
      const providersWithStreamsSet = new Set(providersWithStreams);
      setAvailableProviders(providersWithStreamsSet);
    }
    
    // Update loading states for individual providers
    const expectedProviders = ['stremio'];
    const now = Date.now();
    
    setLoadingProviders(prevLoading => {
      const newLoading = { ...prevLoading };
      expectedProviders.forEach(providerId => {
        // Provider is loading if overall loading is true OR if it doesn't have streams yet
        const hasStreams = currentStreamsData[providerId] && 
                          currentStreamsData[providerId].streams && 
                          currentStreamsData[providerId].streams.length > 0;
        newLoading[providerId] = (loadingStreams || loadingEpisodeStreams) && !hasStreams;
      });
      return newLoading;
    });
    
  }, [loadingStreams, loadingEpisodeStreams, groupedStreams, episodeStreams, type]);

  // Reset the selected provider to 'all' if the current selection is no longer available
  useEffect(() => {
    if (selectedProvider !== 'all' && !availableProviders.has(selectedProvider)) {
      setSelectedProvider('all');
    }
  }, [selectedProvider, availableProviders]);

  // This effect will run when metadata is available or when other dependencies change.
  useEffect(() => {
    // We need metadata to proceed to load streams.
    if (!metadata) {
      return;
    }

    const checkProvidersAndLoad = async () => {
      // Check for Stremio addons
      const hasStremioProviders = await stremioService.hasStreamProviders();
      // NOTE: This will be expanded to check for plugins later
      const hasProviders = hasStremioProviders;

      if (!isMounted.current) return;

      setHasStreamProviders(hasProviders);
      setHasStremioStreamProviders(hasStremioProviders);

      if (!hasProviders) {
        const timer = setTimeout(() => {
          if (isMounted.current) setShowNoSourcesError(true);
        }, 500);
        return () => clearTimeout(timer);
      } else {
        if (type === 'series' && episodeId) {
          logger.log(`🎬 Loading episode streams for: ${episodeId}`);
          setLoadingProviders({
            'stremio': true
          });
          setSelectedEpisode(episodeId);
          setStreamsLoadStart(Date.now());
          loadEpisodeStreams(episodeId);
        } else if (type === 'movie') {
          logger.log(`🎬 Loading movie streams for: ${id}`);
          setStreamsLoadStart(Date.now());
          loadStreams();
        }

        // Reset autoplay state when content changes
        setAutoplayTriggered(false);
        if (settings.autoplayBestStream) {
          setIsAutoplayWaiting(true);
          logger.log('🔄 Autoplay enabled, waiting for best stream...');
        } else {
          setIsAutoplayWaiting(false);
        }
      }
    };

    checkProvidersAndLoad();
    // Adding metadata to the dependency array ensures this runs after metadata is fetched.
  }, [metadata, type, id, episodeId, settings.autoplayBestStream]);

  React.useEffect(() => {
    // Trigger entrance animations
    headerOpacity.value = withTiming(1, { duration: 400 });
    heroScale.value = withSpring(1, {
      damping: 15,
      stiffness: 100,
      mass: 0.9,
      restDisplacementThreshold: 0.01
    });
    filterOpacity.value = withTiming(1, { duration: 500 });

    return () => {
      // Cleanup animations on unmount
      cancelAnimation(headerOpacity);
      cancelAnimation(heroScale);
      cancelAnimation(filterOpacity);
    };
  }, []);

  // Memoize handlers
  const handleBack = useCallback(() => {
    const cleanup = () => {
      headerOpacity.value = withTiming(0, { duration: 100 });
      heroScale.value = withTiming(0.95, { duration: 100 });
      filterOpacity.value = withTiming(0, { duration: 100 });
    };
    cleanup();
    
    // For series episodes, always replace current screen with metadata screen
    if (type === 'series') {
      // Immediate navigation for series
      navigation.replace('Metadata', {
        id: id,
        type: type
      });
    } else {
      // Immediate navigation for movies
      navigation.goBack();
    }
  }, [navigation, headerOpacity, heroScale, filterOpacity, type, id]);

  const handleProviderChange = useCallback((provider: string) => {
    setSelectedProvider(provider);
  }, []);

  // Function to determine the best stream based on quality, provider priority, and other factors
  const getBestStream = useCallback((streamsData: typeof groupedStreams): Stream | null => {
    if (!streamsData || Object.keys(streamsData).length === 0) {
      return null;
    }

    // Helper function to extract quality as number
    const getQualityNumeric = (title: string | undefined): number => {
      if (!title) return 0;
      const matchWithP = title.match(/(\d+)p/i);
      if (matchWithP) return parseInt(matchWithP[1], 10);
      
      const qualityPatterns = [
        /\b(240|360|480|720|1080|1440|2160|4320|8000)\b/i
      ];
      
      for (const pattern of qualityPatterns) {
        const match = title.match(pattern);
        if (match) {
          const quality = parseInt(match[1], 10);
          if (quality >= 240 && quality <= 8000) return quality;
        }
      }
      return 0;
    };

    // Provider priority (higher number = higher priority)
    const getProviderPriority = (addonId: string): number => {
      // Get Stremio addon installation order (earlier = higher priority)
      const installedAddons = stremioService.getInstalledAddons();
      const addonIndex = installedAddons.findIndex(addon => addon.id === addonId);
      
      if (addonIndex !== -1) {
        // Higher priority for addons installed earlier (reverse index)
        return 50 - addonIndex;
      }
      
      return 0; // Unknown providers get lowest priority
    };

    // Collect all streams with metadata
    const allStreams: Array<{
      stream: Stream;
      quality: number;
      providerPriority: number;
      isDebrid: boolean;
      isCached: boolean;
    }> = [];

    Object.entries(streamsData).forEach(([addonId, { streams }]) => {
      streams.forEach(stream => {
        const quality = getQualityNumeric(stream.name || stream.title);
        const providerPriority = getProviderPriority(addonId);
        const isDebrid = stream.behaviorHints?.cached || false;
        const isCached = isDebrid;

        allStreams.push({
          stream,
          quality,
          providerPriority,
          isDebrid,
          isCached,
        });
      });
    });

    if (allStreams.length === 0) return null;

    // Sort streams by multiple criteria (best first)
    allStreams.sort((a, b) => {
      // 1. Prioritize cached/debrid streams
      if (a.isCached !== b.isCached) {
        return a.isCached ? -1 : 1;
      }

      // 2. Prioritize higher quality
      if (a.quality !== b.quality) {
        return b.quality - a.quality;
      }

      // 3. Prioritize better providers
      if (a.providerPriority !== b.providerPriority) {
        return b.providerPriority - a.providerPriority;
      }

      return 0;
    });

    logger.log(`🎯 Best stream selected: ${allStreams[0].stream.name || allStreams[0].stream.title} (Quality: ${allStreams[0].quality}p, Provider Priority: ${allStreams[0].providerPriority}, Cached: ${allStreams[0].isCached})`);
    
    return allStreams[0].stream;
  }, []);

  const currentEpisode = useMemo(() => {
    if (!selectedEpisode) return null;

    // Search through all episodes in all seasons
    const allEpisodes = Object.values(groupedEpisodes).flat();
    return allEpisodes.find(ep => 
      ep.stremioId === selectedEpisode || 
      `${id}:${ep.season_number}:${ep.episode_number}` === selectedEpisode
    );
  }, [selectedEpisode, groupedEpisodes, id]);

  const navigateToPlayer = useCallback(async (stream: Stream) => {
    try {
      // Lock orientation to landscape before navigation to prevent glitches
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
      
      // Small delay to ensure orientation is set before navigation
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Prepare available streams for the change source feature
      const streamsToPass = type === 'series' ? episodeStreams : groupedStreams;
      
      // Determine the stream name using the same logic as StreamCard
      const streamName = stream.name || stream.title || 'Unnamed Stream';
      
      navigation.navigate('Player', {
        uri: stream.url,
        title: metadata?.name || '',
        episodeTitle: type === 'series' ? currentEpisode?.name : undefined,
        season: type === 'series' ? currentEpisode?.season_number : undefined,
        episode: type === 'series' ? currentEpisode?.episode_number : undefined,
        quality: stream.title?.match(/(\d+)p/)?.[1] || undefined,
        year: metadata?.year,
        streamProvider: stream.name,
        streamName: streamName,
        id,
        type,
        episodeId: type === 'series' && selectedEpisode ? selectedEpisode : undefined,
        imdbId: imdbId || undefined,
        availableStreams: streamsToPass,
        backdrop: bannerImage || undefined,
      });
    } catch (error) {
      logger.error('[StreamsScreen] Error locking orientation before navigation:', error);
      // Fallback: navigate anyway
      const streamsToPass = type === 'series' ? episodeStreams : groupedStreams;
      
      navigation.navigate('Player', {
        uri: stream.url,
        title: metadata?.name || '',
        episodeTitle: type === 'series' ? currentEpisode?.name : undefined,
        season: type === 'series' ? currentEpisode?.season_number : undefined,
        episode: type === 'series' ? currentEpisode?.episode_number : undefined,
        quality: stream.title?.match(/(\d+)p/)?.[1] || undefined,
        year: metadata?.year,
        streamProvider: stream.name,
        id,
        type,
        episodeId: type === 'series' && selectedEpisode ? selectedEpisode : undefined,
        imdbId: imdbId || undefined,
        availableStreams: streamsToPass,
        backdrop: bannerImage || undefined,
      });
    }
  }, [metadata, type, currentEpisode, navigation, id, selectedEpisode, imdbId, episodeStreams, groupedStreams, bannerImage]);

  // Update handleStreamPress
  const handleStreamPress = useCallback(async (stream: Stream) => {
    try {
      if (stream.url) {
        logger.log('handleStreamPress called with stream:', {
          url: stream.url,
          behaviorHints: stream.behaviorHints,
          useExternalPlayer: settings.useExternalPlayer,
          preferredPlayer: settings.preferredPlayer
        });
        
        // For iOS, try to open with the preferred external player
        if (Platform.OS === 'ios' && settings.preferredPlayer !== 'internal') {
          try {
            // Format the URL for the selected player
            const streamUrl = encodeURIComponent(stream.url);
            let externalPlayerUrls: string[] = [];
            
            // Configure URL formats based on the selected player
            switch (settings.preferredPlayer) {
              case 'vlc':
                externalPlayerUrls = [
                  `vlc://${stream.url}`,
                  `vlc-x-callback://x-callback-url/stream?url=${streamUrl}`,
                  `vlc://${streamUrl}`
                ];
                break;
                
              case 'outplayer':
                externalPlayerUrls = [
                  `outplayer://${stream.url}`,
                  `outplayer://${streamUrl}`,
                  `outplayer://play?url=${streamUrl}`,
                  `outplayer://stream?url=${streamUrl}`,
                  `outplayer://play/browser?url=${streamUrl}`
                ];
                break;
                
              case 'infuse':
                externalPlayerUrls = [
                  `infuse://x-callback-url/play?url=${streamUrl}`,
                  `infuse://play?url=${streamUrl}`,
                  `infuse://${streamUrl}`
                ];
                break;
                
              case 'vidhub':
                externalPlayerUrls = [
                  `vidhub://play?url=${streamUrl}`,
                  `vidhub://${streamUrl}`
                ];
                break;
                
              default:
                // If no matching player or the setting is somehow invalid, use internal player
                navigateToPlayer(stream);
                return;
            }
            
            console.log(`Attempting to open stream in ${settings.preferredPlayer}`);
            
            // Try each URL format in sequence
            const tryNextUrl = (index: number) => {
              if (index >= externalPlayerUrls.length) {
                console.log(`All ${settings.preferredPlayer} formats failed, falling back to direct URL`);
                // Try direct URL as last resort
                Linking.openURL(stream.url)
                  .then(() => console.log('Opened with direct URL'))
                  .catch(() => {
                    console.log('Direct URL failed, falling back to built-in player');
                    navigateToPlayer(stream);
                  });
                return;
              }
              
              const url = externalPlayerUrls[index];
              console.log(`Trying ${settings.preferredPlayer} URL format ${index + 1}: ${url}`);
              
              Linking.openURL(url)
                .then(() => console.log(`Successfully opened stream with ${settings.preferredPlayer} format ${index + 1}`))
                .catch(err => {
                  console.log(`Format ${index + 1} failed: ${err.message}`, err);
                  tryNextUrl(index + 1);
                });
            };
            
            // Start with the first URL format
            tryNextUrl(0);
            
          } catch (error) {
            console.error(`Error with ${settings.preferredPlayer}:`, error);
            // Fallback to the built-in player
            navigateToPlayer(stream);
          }
        } 
        // For Android with external player preference
        else if (Platform.OS === 'android' && settings.useExternalPlayer) {
          try {
            console.log('Opening stream with Android native app chooser');
            
            // For Android, determine if the URL is a direct http/https URL or a magnet link
            const isMagnet = stream.url.startsWith('magnet:');
            
            if (isMagnet) {
              // For magnet links, open directly which will trigger the torrent app chooser
              console.log('Opening magnet link directly');
              Linking.openURL(stream.url)
                .then(() => console.log('Successfully opened magnet link'))
                .catch(err => {
                  console.error('Failed to open magnet link:', err);
                  // No good fallback for magnet links
                  navigateToPlayer(stream);
                });
            } else {
              // For direct video URLs, use the VideoPlayerService to show the Android app chooser
              const success = await VideoPlayerService.playVideo(stream.url, {
                useExternalPlayer: true,
                title: metadata?.name || 'Video',
                episodeTitle: type === 'series' ? currentEpisode?.name : undefined,
                episodeNumber: type === 'series' && currentEpisode ? `S${currentEpisode.season_number}E${currentEpisode.episode_number}` : undefined,
              });
              
              if (!success) {
                console.log('VideoPlayerService failed, falling back to built-in player');
                      navigateToPlayer(stream);
              }
            }
          } catch (error) {
            console.error('Error with external player:', error);
            // Fallback to the built-in player
            navigateToPlayer(stream);
          }
        }
        else {
          // For internal player or if other options failed, use the built-in player
          navigateToPlayer(stream);
        }
      }
    } catch (error) {
      console.error('Error in handleStreamPress:', error);
      // Final fallback: Use built-in player
      navigateToPlayer(stream);
    }
  }, [settings.preferredPlayer, settings.useExternalPlayer, navigateToPlayer]);

  // Autoplay effect - triggers immediately when streams are available and autoplay is enabled
  useEffect(() => {
    if (
      settings.autoplayBestStream && 
      !autoplayTriggered && 
      isAutoplayWaiting
    ) {
      const streams = type === 'series' ? episodeStreams : groupedStreams;
      
      if (Object.keys(streams).length > 0) {
        const bestStream = getBestStream(streams);
        
        if (bestStream) {
          logger.log('🚀 Autoplay: Best stream found, starting playback immediately...');
          setAutoplayTriggered(true);
          setIsAutoplayWaiting(false);
          
          // Start playback immediately - no delay needed
          handleStreamPress(bestStream);
        } else {
          logger.log('⚠️ Autoplay: No suitable stream found');
          setIsAutoplayWaiting(false);
        }
      }
    }
  }, [
    settings.autoplayBestStream,
    autoplayTriggered,
    isAutoplayWaiting,
    type,
    episodeStreams,
    groupedStreams,
    getBestStream,
    handleStreamPress
  ]);

  const filterItems = useMemo(() => {
    const installedAddons = stremioService.getInstalledAddons();
    const streams = type === 'series' ? episodeStreams : groupedStreams;
    
    // Make sure we include all providers with streams, not just those in availableProviders
    const allProviders = new Set([
      ...availableProviders,
      ...Object.keys(streams).filter(key => 
        streams[key] && 
        streams[key].streams && 
        streams[key].streams.length > 0
      )
    ]);

    return [
      { id: 'all', name: 'All Providers' },
      ...Array.from(allProviders)
        .sort((a, b) => {
          // Sort by Stremio addon installation order
          const indexA = installedAddons.findIndex(addon => addon.id === a);
          const indexB = installedAddons.findIndex(addon => addon.id === b);
          
          if (indexA !== -1 && indexB !== -1) return indexA - indexB;
          if (indexA !== -1) return -1;
          if (indexB !== -1) return 1;
          return 0;
        })
        .map(provider => {
          const addonInfo = streams[provider];
          
          // Standard handling for Stremio addons
          const installedAddon = installedAddons.find(addon => addon.id === provider);
          
          let displayName = provider;
          if (installedAddon) displayName = installedAddon.name;
          else if (addonInfo?.addonName) displayName = addonInfo.addonName;
          
          return { id: provider, name: displayName };
        })
    ];
  }, [availableProviders, type, episodeStreams, groupedStreams]);

  const sections = useMemo(() => {
    const streams = type === 'series' ? episodeStreams : groupedStreams;
    const installedAddons = stremioService.getInstalledAddons();

    // Helper function to extract quality as a number for sorting
    const getQualityNumeric = (title: string | undefined): number => {
      if (!title) return 0;
      
      // First try to match quality with "p" (e.g., "1080p", "720p")
      const matchWithP = title.match(/(\d+)p/i);
      if (matchWithP) {
        return parseInt(matchWithP[1], 10);
      }
      
      // Then try to match standalone quality numbers at the end of the title
      const matchAtEnd = title.match(/\b(\d{3,4})\s*$/);
      if (matchAtEnd) {
        const quality = parseInt(matchAtEnd[1], 10);
        // Only return if it looks like a video quality (between 240 and 8000)
        if (quality >= 240 && quality <= 8000) {
          return quality;
        }
      }
      
      // Try to match quality patterns anywhere in the title with common formats
      const qualityPatterns = [
        /\b(\d{3,4})p\b/i,  // 1080p, 720p, etc.
        /\b(\d{3,4})\s*$/,   // 1080, 720 at end
        /\s(\d{3,4})\s/,     // 720 surrounded by spaces
        /-\s*(\d{3,4})\s*$/,  // -720 at end
        /\b(240|360|480|720|1080|1440|2160|4320|8000)\b/i // specific quality values
      ];
      
      for (const pattern of qualityPatterns) {
        const match = title.match(pattern);
        if (match) {
          const quality = parseInt(match[1], 10);
          if (quality >= 240 && quality <= 8000) {
            return quality;
          }
        }
      }
      
      return 0;
    };

    // Filter streams by selected provider - only if not "all"
    const filteredEntries = Object.entries(streams)
      .filter(([addonId]) => {
        // If "all" is selected, show all providers
        if (selectedProvider === 'all') {
          return true;
        }
        // Otherwise only show the selected provider
        return addonId === selectedProvider;
      })
      .sort(([addonIdA], [addonIdB]) => {
        // Sort by Stremio addon installation order
        const indexA = installedAddons.findIndex(addon => addon.id === addonIdA);
        const indexB = installedAddons.findIndex(addon => addon.id === addonIdB);
        
        if (indexA !== -1 && indexB !== -1) return indexA - indexB;
        if (indexA !== -1) return -1;
        if (indexB !== -1) return 1;
        return 0;
      })
      .map(([addonId, { addonName, streams: providerStreams }]) => {
        // Sort streams by quality if possible
        const sortedProviderStreams = [...providerStreams].sort((a, b) => {
          const qualityA = getQualityNumeric(a.name || a.title);
          const qualityB = getQualityNumeric(b.name || b.title);
          return qualityB - qualityA; // Sort descending
        });
        
        return {
          title: addonName,
          addonId,
          data: sortedProviderStreams
        };
      });
      
    return filteredEntries;
  }, [selectedProvider, type, episodeStreams, groupedStreams]);

  const episodeImage = useMemo(() => {
    if (episodeThumbnail) {
      if (episodeThumbnail.startsWith('http')) {
        return episodeThumbnail;
      }
      return tmdbService.getImageUrl(episodeThumbnail, 'original');
    }
    if (!currentEpisode) return null;
    if (currentEpisode.still_path) {
      if (currentEpisode.still_path.startsWith('http')) {
        return currentEpisode.still_path;
      }
      return tmdbService.getImageUrl(currentEpisode.still_path, 'original');
    }
    return metadata?.poster || null;
  }, [currentEpisode, metadata, episodeThumbnail]);

  const isLoading = type === 'series' ? loadingEpisodeStreams : loadingStreams;
  const streams = type === 'series' ? episodeStreams : groupedStreams;

  // Determine extended loading phases
  const streamsEmpty = Object.keys(streams).length === 0;
  const loadElapsed = streamsLoadStart ? Date.now() - streamsLoadStart : 0;
  const showInitialLoading = streamsEmpty && (streamsLoadStart === null || loadElapsed < 10000);
  const showStillFetching = streamsEmpty && loadElapsed >= 10000;

  const heroStyle = useAnimatedStyle(() => ({
    transform: [{ scale: heroScale.value }],
    opacity: headerOpacity.value
  }));

  const filterStyle = useAnimatedStyle(() => ({
    opacity: filterOpacity.value,
    transform: [
      { 
        translateY: interpolate(
          filterOpacity.value,
          [0, 1],
          [20, 0],
          Extrapolate.CLAMP
        )
      }
    ]
  }));

  const renderItem = useCallback(({ item, index, section }: { item: Stream; index: number; section: any }) => {
    const stream = item;
    // Don't show loading for individual streams that are already available and displayed
    const isLoading = false; // If streams are being rendered, they're available and shouldn't be loading
    
    return (
      <StreamCard 
        key={`${stream.url}-${index}`}
        stream={stream} 
        onPress={() => handleStreamPress(stream)} 
        index={index}
        isLoading={isLoading}
        statusMessage={undefined}
        theme={currentTheme}
      />
    );
  }, [handleStreamPress, currentTheme]);

  const renderSectionHeader = useCallback(({ section }: { section: { title: string; addonId: string } }) => {
    const isProviderLoading = loadingProviders[section.addonId];
    
    return (
      <Animated.View
        entering={FadeIn.duration(400)}
        exiting={FadeOut.duration(150)}
        style={styles.sectionHeaderContainer}
      >
        <View style={styles.sectionHeaderContent}>
          <Text style={styles.streamGroupTitle}>{section.title}</Text>
          {isProviderLoading && (
            <View style={styles.sectionLoadingIndicator}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={[styles.sectionLoadingText, { color: colors.primary }]}>
                Loading...
              </Text>
            </View>
          )}
        </View>
      </Animated.View>
    );
  }, [styles.streamGroupTitle, styles.sectionHeaderContainer, styles.sectionHeaderContent, styles.sectionLoadingIndicator, styles.sectionLoadingText, loadingProviders, colors.primary]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);



  return (
    <View style={styles.container}>
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle="light-content"
      />
      
      
      <Animated.View
        entering={FadeIn.duration(300)}
        style={[styles.backButtonContainer]}
      >
        <TouchableOpacity 
          style={styles.backButton}
          onPress={handleBack}
          activeOpacity={0.7}
        >
          <MaterialIcons name="arrow-back" size={24} color={colors.white} />
          <Text style={styles.backButtonText}>
            {type === 'series' ? 'Back to Episodes' : 'Back to Info'}
          </Text>
        </TouchableOpacity>
      </Animated.View>

      {type === 'movie' && metadata && (
        <Animated.View style={[styles.movieTitleContainer, heroStyle]}>
          <View style={styles.movieTitleContent}>
            {metadata.logo ? (
              <Image
                source={{ uri: metadata.logo }}
                style={styles.movieLogo}
                contentFit="contain"
              />
            ) : (
              <Text style={styles.movieTitle} numberOfLines={2}>
                {metadata.name}
              </Text>
            )}
          </View>
        </Animated.View>
      )}

      {type === 'series' && currentEpisode && (
        <Animated.View style={[styles.streamsHeroContainer, heroStyle]}>
          <Animated.View
            entering={FadeIn.duration(300)}
            style={StyleSheet.absoluteFill}
          >
            <Animated.View 
              entering={FadeIn.duration(400).delay(100).withInitialValues({
                transform: [{ scale: 1.05 }]
              })}
              style={StyleSheet.absoluteFill}
            >
              <ImageBackground
                source={episodeImage ? { uri: episodeImage } : undefined}
                style={styles.streamsHeroBackground}
                fadeDuration={0}
                resizeMode="cover"
              >
                <LinearGradient
                  colors={[
                    'rgba(0,0,0,0)',
                    'rgba(0,0,0,0.3)',
                    'rgba(0,0,0,0.5)',
                    'rgba(0,0,0,0.7)',
                    colors.darkBackground
                  ]}
                  locations={[0, 0.4, 0.6, 0.8, 1]}
                  style={styles.streamsHeroGradient}
                >
                  <View style={styles.streamsHeroContent}>
                    <View style={styles.streamsHeroInfo}>
                      <Text style={styles.streamsHeroEpisodeNumber}>
                        {currentEpisode.episodeString}
                      </Text>
                      <Text style={styles.streamsHeroTitle} numberOfLines={1}>
                        {currentEpisode.name}
                      </Text>
                      {currentEpisode.overview && (
                        <Text style={styles.streamsHeroOverview} numberOfLines={2}>
                          {currentEpisode.overview}
                        </Text>
                      )}
                      <View style={styles.streamsHeroMeta}>
                        <Text style={styles.streamsHeroReleased}>
                          {tmdbService.formatAirDate(currentEpisode.air_date)}
                        </Text>
                        {currentEpisode.vote_average > 0 && (
                          <View style={styles.streamsHeroRating}>
                            <Image
                              source={{ uri: TMDB_LOGO }}
                              style={styles.tmdbLogo}
                              contentFit="contain"
                            />
                            <Text style={styles.streamsHeroRatingText}>
                              {currentEpisode.vote_average.toFixed(1)}
                            </Text>
                          </View>
                        )}
                        {currentEpisode.runtime && (
                          <View style={styles.streamsHeroRuntime}>
                            <MaterialIcons name="schedule" size={16} color={colors.mediumEmphasis} />
                            <Text style={styles.streamsHeroRuntimeText}>
                              {currentEpisode.runtime >= 60
                                ? `${Math.floor(currentEpisode.runtime / 60)}h ${currentEpisode.runtime % 60}m`
                                : `${currentEpisode.runtime}m`}
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </View>
                </LinearGradient>
              </ImageBackground>
            </Animated.View>
          </Animated.View>
        </Animated.View>
      )}

      <View style={[
        styles.streamsMainContent,
        type === 'movie' && styles.streamsMainContentMovie
      ]}>
        <Animated.View style={[styles.filterContainer, filterStyle]}>
          {Object.keys(streams).length > 0 && (
            <ProviderFilter
              selectedProvider={selectedProvider}
              providers={filterItems}
              onSelect={handleProviderChange}
              theme={currentTheme}
            />
          )}
        </Animated.View>

        {/* Update the streams/loading state display logic */}
        { showNoSourcesError ? (
            <Animated.View 
              entering={FadeIn.duration(300)}
              style={styles.noStreams}
            >
              <MaterialIcons name="error-outline" size={48} color={colors.textMuted} />
              <Text style={styles.noStreamsText}>No streaming sources available</Text>
              <Text style={styles.noStreamsSubText}>
                Please add streaming sources in settings
              </Text>
              <TouchableOpacity
                style={styles.addSourcesButton}
                onPress={() => navigation.navigate('Addons')}
              >
                <Text style={styles.addSourcesButtonText}>Add Sources</Text>
              </TouchableOpacity>
            </Animated.View>
        ) : streamsEmpty ? (
          showInitialLoading ? (
            <Animated.View 
              entering={FadeIn.duration(300)}
              style={styles.loadingContainer}
            >
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingText}>
                {isAutoplayWaiting ? 'Finding best stream for autoplay...' : 'Finding available streams...'}
              </Text>
            </Animated.View>
          ) : showStillFetching ? (
            <Animated.View 
              entering={FadeIn.duration(300)}
              style={styles.loadingContainer}
            >
              <MaterialIcons name="hourglass-bottom" size={32} color={colors.primary} />
              <Text style={styles.loadingText}>Still fetching streams…</Text>
            </Animated.View>
          ) : (
            // No streams and not loading = no streams available
            <Animated.View 
              entering={FadeIn.duration(300)}
              style={styles.noStreams}
            >
              <MaterialIcons name="error-outline" size={48} color={colors.textMuted} />
              <Text style={styles.noStreamsText}>No streams available</Text>
            </Animated.View>
          )
        ) : (
          // Show streams immediately when available, even if still loading others
          <View collapsable={false} style={{ flex: 1 }}>
            {/* Show autoplay loading overlay if waiting for autoplay */}
            {isAutoplayWaiting && !autoplayTriggered && (
              <Animated.View 
                entering={FadeIn.duration(300)}
                style={styles.autoplayOverlay}
              >
                <View style={styles.autoplayIndicator}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={styles.autoplayText}>Starting best stream...</Text>
                </View>
              </Animated.View>
            )}
            
            <SectionList
              sections={sections}
              keyExtractor={(item) => item.url || `${item.name}-${item.title}`}
              renderItem={renderItem}
              renderSectionHeader={renderSectionHeader}
              stickySectionHeadersEnabled={false}
              initialNumToRender={6}
              maxToRenderPerBatch={3}
              windowSize={4}
              removeClippedSubviews={false}
              contentContainerStyle={styles.streamsContainer}
              style={styles.streamsContent}
              showsVerticalScrollIndicator={false}
              bounces={true}
              overScrollMode="never"
              ListFooterComponent={
                (loadingStreams || loadingEpisodeStreams) && hasStremioStreamProviders ? (
                  <View style={styles.footerLoading}>
                    <ActivityIndicator size="small" color={colors.primary} />
                    <Text style={styles.footerLoadingText}>Loading more sources...</Text>
                  </View>
                ) : null
              }
            />
          </View>
        )}
      </View>
    </View>
  );
};

// Create a function to generate styles with the current theme colors
const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.darkBackground,
  },
  backButtonContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 2,
    pointerEvents: 'box-none',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 14,
    paddingTop: Platform.OS === 'android' ? 45 : 15,
  },
  backButtonText: {
    color: colors.highEmphasis,
    fontSize: 13,
    fontWeight: '600',
  },
  streamsMainContent: {
    flex: 1,
    backgroundColor: colors.darkBackground,
    paddingTop: 20,
    zIndex: 1,
  },
  streamsMainContentMovie: {
    paddingTop: Platform.OS === 'android' ? 10 : 15,
  },
  filterContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  filterScroll: {
    flexGrow: 0,
  },
  filterChip: {
    backgroundColor: 'transparent',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    color: colors.mediumEmphasis,
    fontWeight: '500',
  },
  filterChipTextSelected: {
    color: colors.white,
    fontWeight: '600',
  },
  streamsContent: {
    flex: 1,
    width: '100%',
    zIndex: 2,
  },
  streamsContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    width: '100%',
  },
  streamGroup: {
    marginBottom: 24,
    width: '100%',
  },
  streamGroupTitle: {
    color: colors.highEmphasis,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 8,
    marginTop: 0,
    backgroundColor: 'transparent',
  },
  streamCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    borderRadius: 10,
    marginBottom: 12,
    minHeight: 70,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardHighlight,
    width: '100%',
    zIndex: 1,
  },
  streamCardLoading: {
    opacity: 0.7,
  },
  streamDetails: {
    flex: 1,
  },
  streamNameRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    width: '100%',
    flexWrap: 'wrap',
    gap: 8
  },
  streamTitleContainer: {
    flex: 1,
  },
  streamName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
    lineHeight: 20,
    color: colors.highEmphasis,
  },
  streamAddonName: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.mediumEmphasis,
    marginBottom: 6,
  },
  streamMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 6,
    alignItems: 'center',
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    marginRight: 4,
    marginBottom: 4,
    backgroundColor: colors.surfaceVariant,
  },
  chipText: {
    color: colors.highEmphasis,
    fontSize: 12,
    fontWeight: '600',
  },
  progressContainer: {
    height: 20,
    backgroundColor: colors.transparentLight,
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressBar: {
    height: '100%',
    backgroundColor: colors.primary,
  },
  progressText: {
    color: colors.highEmphasis,
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 8,
  },
  streamAction: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  skeletonCard: {
    opacity: 0.7,
  },
  skeletonTitle: {
    height: 24,
    width: '40%',
    backgroundColor: colors.transparentLight,
    borderRadius: 4,
    marginBottom: 16,
  },
  skeletonIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.transparentLight,
    marginRight: 12,
  },
  skeletonText: {
    height: 16,
    borderRadius: 4,
    marginBottom: 8,
    backgroundColor: colors.transparentLight,
  },
  skeletonTag: {
    width: 60,
    height: 20,
    borderRadius: 4,
    marginRight: 8,
    backgroundColor: colors.transparentLight,
  },
  noStreams: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  noStreamsText: {
    color: colors.textMuted,
    fontSize: 16,
    marginTop: 16,
  },
  streamsHeroContainer: {
    width: '100%',
    height: 220,
    marginBottom: 0,
    position: 'relative',
    backgroundColor: colors.black,
    pointerEvents: 'box-none',
  },
  streamsHeroBackground: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.black,
  },
  streamsHeroGradient: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: 16,
    paddingBottom: 0,
  },
  streamsHeroContent: {
    width: '100%',
  },
  streamsHeroInfo: {
    width: '100%',
  },
  streamsHeroEpisodeNumber: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 2,
    textShadowColor: 'rgba(0,0,0,0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  streamsHeroTitle: {
    color: colors.highEmphasis,
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
    textShadowColor: 'rgba(0,0,0,0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  streamsHeroOverview: {
    color: colors.mediumEmphasis,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 2,
    textShadowColor: 'rgba(0,0,0,0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  streamsHeroMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 0,
  },
  streamsHeroReleased: {
    color: colors.mediumEmphasis,
    fontSize: 14,
    textShadowColor: 'rgba(0,0,0,0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  streamsHeroRating: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    marginTop: 0,
  },
  tmdbLogo: {
    width: 20,
    height: 14,
  },
  streamsHeroRatingText: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 4,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  loadingText: {
    color: colors.primary,
    fontSize: 12,
    marginLeft: 4,
    fontWeight: '500',
  },
  downloadingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.transparentLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginLeft: 8,
  },
  downloadingText: {
    color: colors.primary,
    fontSize: 12,
    marginLeft: 4,
    fontWeight: '500',
  },
  loadingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginLeft: 8,
  },
  footerLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  footerLoadingText: {
    color: colors.primary,
    fontSize: 12,
    marginLeft: 8,
    fontWeight: '500',
  },
  movieTitleContainer: {
    width: '100%',
    height: 140,
    backgroundColor: colors.darkBackground,
    pointerEvents: 'box-none',
    justifyContent: 'center',
    paddingTop: Platform.OS === 'android' ? 65 : 35,
  },
  movieTitleContent: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  movieLogo: {
    width: '100%',
    height: '100%',
    maxWidth: width * 0.85,
  },
  movieTitle: {
    color: colors.highEmphasis,
    fontSize: 28,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: -0.5,
    paddingHorizontal: 20,
  },
  streamsHeroRuntime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  streamsHeroRuntimeText: {
    color: colors.mediumEmphasis,
    fontSize: 13,
    fontWeight: '600',
  },
  transitionOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.darkBackground,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  sectionHeaderContainer: {
    padding: 16,
  },
  sectionHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionLoadingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionLoadingText: {
    marginLeft: 8,
  },
  autoplayOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.8)',
    padding: 16,
    alignItems: 'center',
    zIndex: 10,
  },
  autoplayIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.elevation2,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
  },
  autoplayText: {
    color: colors.primary,
    fontSize: 14,
    marginLeft: 8,
    fontWeight: '600',
  },
  noStreamsSubText: {
    color: colors.mediumEmphasis,
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  addSourcesButton: {
    marginTop: 24,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: colors.primary,
    borderRadius: 8,
  },
  addSourcesButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
});

export default memo(StreamsScreen); 