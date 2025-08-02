import React, { useCallback, useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
  Dimensions,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../contexts/ThemeContext';
import { useMetadata } from '../hooks/useMetadata';
import { CastSection } from '../components/metadata/CastSection';
import { CastDetailsModal } from '../components/metadata/CastDetailsModal';
import { SeriesContent } from '../components/metadata/SeriesContent';
import { MovieContent } from '../components/metadata/MovieContent';
import { MoreLikeThisSection } from '../components/metadata/MoreLikeThisSection';
import { RatingsSection } from '../components/metadata/RatingsSection';
import { RouteParams, Episode } from '../types/metadata';
import { RouteProp } from '@react-navigation/native';
import { NavigationProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useSettings } from '../hooks/useSettings';
import { MetadataLoadingScreen } from '../components/loading/MetadataLoadingScreen';

// Import our optimized components and hooks
import HeroSection from '../components/metadata/HeroSection';
import FloatingHeader from '../components/metadata/FloatingHeader';
import MetadataDetails from '../components/metadata/MetadataDetails';
import { useMetadataAssets } from '../hooks/useMetadataAssets';
import { useWatchProgress } from '../hooks/useWatchProgress';
import { TraktService, TraktPlaybackItem } from '../services/traktService';

const { height } = Dimensions.get('window');

const MetadataScreen: React.FC = () => {
  const route = useRoute<RouteProp<Record<string, RouteParams & { episodeId?: string; addonId?: string }>, string>>();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { id, type, episodeId, addonId } = route.params;
  
  // Consolidated hooks for better performance
  const { settings } = useSettings();
  const { currentTheme } = useTheme();
  const { top: safeAreaTop } = useSafeAreaInsets();

  // Optimized state management - reduced state variables
  const [isContentReady, setIsContentReady] = useState(false);
  const [showCastModal, setShowCastModal] = useState(false);
  const [selectedCastMember, setSelectedCastMember] = useState<any>(null);
  // Removed animation state

  const {
    metadata,
    loading,
    error: metadataError,
    cast,
    loadingCast,
    episodes,
    selectedSeason,
    loadingSeasons,
    loadMetadata,
    handleSeasonChange,
    toggleLibrary,
    inLibrary,
    groupedEpisodes,
    recommendations,
    loadingRecommendations,
    setMetadata,
    imdbId,
  } = useMetadata({ id, type, addonId });

  // Optimized hooks with memoization
  const watchProgressData = useWatchProgress(id, type as 'movie' | 'series', episodeId, episodes);
  const assetData = useMetadataAssets(metadata, id, type, imdbId, settings, setMetadata);

  // Fetch and log Trakt progress data when entering the screen
  useEffect(() => {
    const fetchTraktProgress = async () => {
      try {
        const traktService = TraktService.getInstance();
        const isAuthenticated = await traktService.isAuthenticated();
        
        console.log(`[MetadataScreen] === TRAKT PROGRESS DATA FOR ${type.toUpperCase()}: ${metadata?.name || id} ===`);
        console.log(`[MetadataScreen] IMDB ID: ${id}`);
        console.log(`[MetadataScreen] Trakt authenticated: ${isAuthenticated}`);
        
        if (!isAuthenticated) {
          console.log(`[MetadataScreen] Not authenticated with Trakt, no progress data available`);
          return;
        }

        // Get all playback progress from Trakt
        const allProgress = await traktService.getPlaybackProgress();
        console.log(`[MetadataScreen] Total Trakt progress items: ${allProgress.length}`);
        
        if (allProgress.length === 0) {
          console.log(`[MetadataScreen] No Trakt progress data found`);
          return;
        }

        // Filter progress for current content
        let relevantProgress: TraktPlaybackItem[] = [];
        
        if (type === 'movie') {
          relevantProgress = allProgress.filter(item => 
            item.type === 'movie' && 
            item.movie?.ids.imdb === id.replace('tt', '')
          );
        } else if (type === 'series') {
          relevantProgress = allProgress.filter(item => 
            item.type === 'episode' && 
            item.show?.ids.imdb === id.replace('tt', '')
          );
        }

        console.log(`[MetadataScreen] Relevant progress items for this ${type}: ${relevantProgress.length}`);
        
        if (relevantProgress.length === 0) {
          console.log(`[MetadataScreen] No Trakt progress found for this ${type}`);
          return;
        }

        // Log detailed progress information
        relevantProgress.forEach((item, index) => {
          console.log(`[MetadataScreen] --- Progress Item ${index + 1} ---`);
          console.log(`[MetadataScreen] Type: ${item.type}`);
          console.log(`[MetadataScreen] Progress: ${item.progress.toFixed(2)}%`);
          console.log(`[MetadataScreen] Paused at: ${item.paused_at}`);
          console.log(`[MetadataScreen] Trakt ID: ${item.id}`);
          
          if (item.movie) {
            console.log(`[MetadataScreen] Movie: ${item.movie.title} (${item.movie.year})`);
            console.log(`[MetadataScreen] Movie IMDB: tt${item.movie.ids.imdb}`);
            console.log(`[MetadataScreen] Movie TMDB: ${item.movie.ids.tmdb}`);
          }
          
          if (item.episode && item.show) {
            console.log(`[MetadataScreen] Show: ${item.show.title} (${item.show.year})`);
            console.log(`[MetadataScreen] Show IMDB: tt${item.show.ids.imdb}`);
            console.log(`[MetadataScreen] Episode: S${item.episode.season}E${item.episode.number} - ${item.episode.title}`);
            console.log(`[MetadataScreen] Episode IMDB: ${item.episode.ids.imdb || 'N/A'}`);
            console.log(`[MetadataScreen] Episode TMDB: ${item.episode.ids.tmdb || 'N/A'}`);
          }
          
          console.log(`[MetadataScreen] Raw item:`, JSON.stringify(item, null, 2));
        });

        // Find most recent progress if multiple episodes
        if (type === 'series' && relevantProgress.length > 1) {
          const mostRecent = relevantProgress.sort((a, b) => 
            new Date(b.paused_at).getTime() - new Date(a.paused_at).getTime()
          )[0];
          
          console.log(`[MetadataScreen] === MOST RECENT EPISODE PROGRESS ===`);
          if (mostRecent.episode && mostRecent.show) {
            console.log(`[MetadataScreen] Most recent: S${mostRecent.episode.season}E${mostRecent.episode.number} - ${mostRecent.episode.title}`);
            console.log(`[MetadataScreen] Progress: ${mostRecent.progress.toFixed(2)}%`);
            console.log(`[MetadataScreen] Watched on: ${new Date(mostRecent.paused_at).toLocaleString()}`);
          }
        }

        console.log(`[MetadataScreen] === END TRAKT PROGRESS DATA ===`);
        
      } catch (error) {
        console.error(`[MetadataScreen] Failed to fetch Trakt progress:`, error);
      }
    };

    // Only fetch when we have metadata loaded
    if (metadata && id) {
      fetchTraktProgress();
    }
  }, [metadata, id, type]);

  // Memoized derived values for performance
  const isReady = useMemo(() => !loading && metadata && !metadataError, [loading, metadata, metadataError]);
  
  // Simple content ready state management
  useEffect(() => {
    if (isReady) {
      setIsContentReady(true);
      // Removed animation logic
    } else if (!isReady && isContentReady) {
        setIsContentReady(false);
      }
  }, [isReady, isContentReady]);

  // Optimized callback functions with reduced dependencies
  const handleToggleLibrary = useCallback(() => {
    Haptics.impactAsync(inLibrary ? Haptics.ImpactFeedbackStyle.Light : Haptics.ImpactFeedbackStyle.Medium);
    toggleLibrary();
  }, [inLibrary, toggleLibrary]);

  const handleSeasonChangeWithHaptics = useCallback((seasonNumber: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    handleSeasonChange(seasonNumber);
  }, [handleSeasonChange]);

  const handleShowStreams = useCallback(() => {
    const { watchProgress } = watchProgressData;

    // Helper to build episodeId from episode object
    const buildEpisodeId = (ep: any): string => {
      return ep.stremioId || `${id}:${ep.season_number}:${ep.episode_number}`;
    };

    if (type === 'series') {
      // Determine if current episode is finished
      let progressPercent = 0;
      if (watchProgress && watchProgress.duration > 0) {
        progressPercent = (watchProgress.currentTime / watchProgress.duration) * 100;
      }

      let targetEpisodeId: string | undefined;

      if (progressPercent >= 85 && watchProgress?.episodeId) {
        // Try to navigate to next episode – support multiple episodeId formats
        let currentSeason: number | null = null;
        let currentEpisode: number | null = null;

        const parts = watchProgress.episodeId.split(':');

        if (parts.length === 3) {
          // showId:season:episode
          currentSeason = parseInt(parts[1], 10);
          currentEpisode = parseInt(parts[2], 10);
        } else if (parts.length === 2) {
          // season:episode
          currentSeason = parseInt(parts[0], 10);
          currentEpisode = parseInt(parts[1], 10);
        } else {
          // pattern like s5e01
          const match = watchProgress.episodeId.match(/s(\d+)e(\d+)/i);
          if (match) {
            currentSeason = parseInt(match[1], 10);
            currentEpisode = parseInt(match[2], 10);
          }
        }

        if (currentSeason !== null && currentEpisode !== null) {
          // DIRECT APPROACH: Just create the next episode ID directly
          // This ensures we navigate to the next episode even if it's not yet in our episodes array
          const nextEpisodeId = `${id}:${currentSeason}:${currentEpisode + 1}`;
          console.log(`[MetadataScreen] Created next episode ID directly: ${nextEpisodeId}`);
          
          // Still try to find the episode in our list to verify it exists
          const nextEpisodeExists = episodes.some(ep => 
            ep.season_number === currentSeason && ep.episode_number === (currentEpisode + 1)
          );
          
          if (nextEpisodeExists) {
            console.log(`[MetadataScreen] Verified next episode S${currentSeason}E${currentEpisode + 1} exists in episodes list`);
          } else {
            console.log(`[MetadataScreen] Warning: Next episode S${currentSeason}E${currentEpisode + 1} not found in episodes list, but proceeding anyway`);
          }
          
          targetEpisodeId = nextEpisodeId;
        }
      }

      // Fallback logic: if not finished or nextEp not found
      if (!targetEpisodeId) {
        targetEpisodeId = watchProgress?.episodeId || episodeId || (episodes.length > 0 ? buildEpisodeId(episodes[0]) : undefined);
        console.log(`[MetadataScreen] Using fallback episode ID: ${targetEpisodeId}`);
      }

      if (targetEpisodeId) {
        // Ensure the episodeId has showId prefix (id:season:episode)
        const epParts = targetEpisodeId.split(':');
        let normalizedEpisodeId = targetEpisodeId;
        if (epParts.length === 2) {
          normalizedEpisodeId = `${id}:${epParts[0]}:${epParts[1]}`;
        }
        console.log(`[MetadataScreen] Navigating to streams with episodeId: ${normalizedEpisodeId}`);
        navigation.navigate('Streams', { id, type, episodeId: normalizedEpisodeId });
        return;
      }
    }

    // Normalize fallback episodeId too
    let fallbackEpisodeId = episodeId;
    if (episodeId && episodeId.split(':').length === 2) {
      const p = episodeId.split(':');
      fallbackEpisodeId = `${id}:${p[0]}:${p[1]}`;
    }
    console.log(`[MetadataScreen] Navigating with fallback episodeId: ${fallbackEpisodeId}`);
    navigation.navigate('Streams', { id, type, episodeId: fallbackEpisodeId });
  }, [navigation, id, type, episodes, episodeId, watchProgressData.watchProgress]);

  const handleEpisodeSelect = useCallback((episode: Episode) => {
    console.log('[MetadataScreen] Selected Episode:', JSON.stringify(episode, null, 2));
    const episodeId = episode.stremioId || `${id}:${episode.season_number}:${episode.episode_number}`;
    navigation.navigate('Streams', { 
      id, 
      type, 
      episodeId,
      episodeThumbnail: episode.still_path || undefined
    });
  }, [navigation, id, type]);

  const handleBack = useCallback(() => navigation.goBack(), [navigation]);
  const handleSelectCastMember = useCallback((castMember: any) => {
    setSelectedCastMember(castMember);
    setShowCastModal(true);
  }, []);

  // Removed animated styles

  // Memoized error component for performance
  const ErrorComponent = useMemo(() => {
    if (!metadataError) return null;
    
    return (
      <SafeAreaView 
        style={[styles.container, { backgroundColor: currentTheme.colors.darkBackground }]}
        edges={['bottom']}
      >
        <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={64} color={currentTheme.colors.textMuted} />
          <Text style={[styles.errorText, { color: currentTheme.colors.highEmphasis }]}>
            {metadataError || 'Content not found'}
          </Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: currentTheme.colors.primary }]}
            onPress={loadMetadata}
          >
            <MaterialIcons name="refresh" size={20} color={currentTheme.colors.white} style={{ marginRight: 8 }} />
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.backButton, { borderColor: currentTheme.colors.primary }]}
            onPress={handleBack}
          >
            <Text style={[styles.backButtonText, { color: currentTheme.colors.primary }]}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }, [metadataError, currentTheme, loadMetadata, handleBack]);

  // Show error if exists
  if (metadataError || (!loading && !metadata)) {
    return ErrorComponent;
  }

  // Show loading screen if metadata is not yet available
  if (loading || !isContentReady) {
    return <MetadataLoadingScreen type={type as 'movie' | 'series'} />;
  }

  return (
    <SafeAreaView 
      style={[styles.container, { backgroundColor: currentTheme.colors.darkBackground }]}
      edges={['bottom']}
    >
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" animated />
      
      {metadata && (
        <>
          {/* Floating Header - Optimized */}
          <FloatingHeader 
            metadata={metadata}
            logoLoadError={assetData.logoLoadError}
            handleBack={handleBack}
            handleToggleLibrary={handleToggleLibrary}
            inLibrary={inLibrary}
            safeAreaTop={safeAreaTop}
            setLogoLoadError={assetData.setLogoLoadError}
          />

          <ScrollView
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
            bounces={false}
            overScrollMode="never"
            contentContainerStyle={styles.scrollContent}
          >
            {/* Hero Section - Optimized */}
            <HeroSection 
              metadata={metadata}
              bannerImage={assetData.bannerImage}
              loadingBanner={assetData.loadingBanner}
              logoLoadError={assetData.logoLoadError}
              watchProgress={watchProgressData.watchProgress}
              type={type as 'movie' | 'series'}
              getEpisodeDetails={watchProgressData.getEpisodeDetails}
              handleShowStreams={handleShowStreams}
              handleToggleLibrary={handleToggleLibrary}
              inLibrary={inLibrary}
              id={id}
              navigation={navigation}
              getPlayButtonText={watchProgressData.getPlayButtonText}
              setBannerImage={assetData.setBannerImage}
              setLogoLoadError={assetData.setLogoLoadError}
              groupedEpisodes={groupedEpisodes}
            />

            {/* Main Content - Optimized */}
            <View>
              <MetadataDetails 
                metadata={metadata}
                imdbId={imdbId}
                type={type as 'movie' | 'series'}
                renderRatings={() => imdbId ? (
                  <RatingsSection imdbId={imdbId} type={type === 'series' ? 'show' : 'movie'} />
                ) : null}
              />

              {/* Cast Section with skeleton when loading */}
              <CastSection
                cast={cast}
                loadingCast={loadingCast}
                onSelectCastMember={handleSelectCastMember}
              />

              {/* Recommendations Section with skeleton when loading */}
              {type === 'movie' && (
                <MoreLikeThisSection 
                  recommendations={recommendations}
                  loadingRecommendations={loadingRecommendations}
                />
              )}

              {/* Series/Movie Content with episode skeleton when loading */}
              {type === 'series' ? (
                <SeriesContent
                  episodes={Object.values(groupedEpisodes).flat()}
                  selectedSeason={selectedSeason}
                  loadingSeasons={loadingSeasons}
                  onSeasonChange={handleSeasonChangeWithHaptics}
                  onSelectEpisode={handleEpisodeSelect}
                  groupedEpisodes={groupedEpisodes}
                  metadata={metadata || undefined}
                />
              ) : (
                metadata && <MovieContent metadata={metadata} />
              )}
            </View>
          </ScrollView>
        </>
      )}
      
      {/* Cast Details Modal */}
      <CastDetailsModal
        visible={showCastModal}
        onClose={() => setShowCastModal(false)}
        castMember={selectedCastMember}
      />
    </SafeAreaView>
  );
};

// Optimized styles with minimal properties
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorText: {
    fontSize: 18,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    marginBottom: 16,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  backButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 2,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  // Skeleton loading styles
  skeletonSection: {
    padding: 16,
    marginBottom: 24,
  },
  skeletonTitle: {
    width: 150,
    height: 20,
    borderRadius: 4,
    marginBottom: 16,
  },
  skeletonCastRow: {
    flexDirection: 'row',
    gap: 12,
  },
  skeletonCastItem: {
    width: 80,
    height: 120,
    borderRadius: 8,
  },
  skeletonRecommendationsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  skeletonRecommendationItem: {
    width: 120,
    height: 180,
    borderRadius: 8,
  },
  skeletonEpisodesContainer: {
    gap: 12,
  },
  skeletonEpisodeItem: {
    width: '100%',
    height: 80,
    borderRadius: 8,
    marginBottom: 8,
  },
});

export default MetadataScreen;