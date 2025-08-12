import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { BlurView as ExpoBlurView } from 'expo-blur';
import { BlurView as CommunityBlurView } from '@react-native-community/blur';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { useTheme } from '../../contexts/ThemeContext';
import { useTraktContext } from '../../contexts/TraktContext';
import { logger } from '../../utils/logger';
import { TMDBService } from '../../services/tmdbService';

const { width, height } = Dimensions.get('window');

// Types - streamlined
interface HeroSectionProps {
  metadata: any;
  bannerImage: string | null;
  loadingBanner: boolean;
  logoLoadError: boolean;
  watchProgress: {
    currentTime: number;
    duration: number;
    lastUpdated: number;
    episodeId?: string;
    traktSynced?: boolean;
    traktProgress?: number;
  } | null;
  type: 'movie' | 'series';
  getEpisodeDetails: (episodeId: string) => { seasonNumber: string; episodeNumber: string; episodeName: string } | null;
  handleShowStreams: () => void;
  handleToggleLibrary: () => void;
  inLibrary: boolean;
  id: string;
  navigation: any;
  getPlayButtonText: () => string;
  setBannerImage: (bannerImage: string | null) => void;
  setLogoLoadError: (error: boolean) => void;
  groupedEpisodes?: { [seasonNumber: number]: any[] };
}

const ActionButtons = React.memo(({ 
  handleShowStreams, 
  toggleLibrary, 
  inLibrary, 
  type, 
  id, 
  navigation, 
  playButtonText,
  isWatched,
  watchProgress,
  groupedEpisodes
}: {
  handleShowStreams: () => void;
  toggleLibrary: () => void;
  inLibrary: boolean;
  type: 'movie' | 'series';
  id: string;
  navigation: any;
  playButtonText: string;
  isWatched: boolean;
  watchProgress: any;
  groupedEpisodes?: { [seasonNumber: number]: any[] };
}) => {
  const { currentTheme } = useTheme();
  
  return (
    <View style={[
      styles.actionButtons,
      Platform.isTV && { paddingHorizontal: 0, gap: 16 }
    ]}>
      <TouchableOpacity 
        style={[
          styles.actionButton, 
          isWatched ? styles.watchedPlayButton : styles.playButton,
          Platform.isTV && { paddingVertical: 16, paddingHorizontal: 26, minWidth: 240 }
        ]} 
        onPress={handleShowStreams}
        hasTVPreferredFocus
        tvParallaxProperties={Platform.isTV ? {
          enabled: true,
          shiftDistanceX: 3.0,
          shiftDistanceY: 3.0,
          tiltAngle: 0.06,
          magnification: 1.08,
        } : undefined}
      >
        <MaterialIcons 
          name="play-arrow" 
          size={Platform.isTV ? 26 : 20} 
          color={isWatched ? "#fff" : "#000"} 
        />
        <Text style={[
          isWatched ? styles.watchedPlayButtonText : styles.playButtonText,
          Platform.isTV && { fontSize: 18 }
        ]}>
          {playButtonText}
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={[
          styles.iconButton, 
          { backgroundColor: 'rgba(255,255,255,0.1)' },
          Platform.isTV && { width: 60, height: 60, borderRadius: 30 }
        ]}
        onPress={toggleLibrary}
        tvParallaxProperties={Platform.isTV ? {
          enabled: true,
          shiftDistanceX: 2.0,
          shiftDistanceY: 2.0,
          tiltAngle: 0.05,
          magnification: 1.06,
        } : undefined}
      >
        {Platform.OS === 'ios' ? (
          <ExpoBlurView intensity={50} tint="dark" style={styles.blurBackgroundRound} />
        ) : (
          <View style={styles.androidFallbackBlurRound} />
        )}
        <MaterialIcons 
          name={inLibrary ? 'bookmark' : 'bookmark-border'} 
          size={Platform.isTV ? 24 : 22} 
          color={currentTheme.colors.highEmphasis}
        />
      </TouchableOpacity>
    </View>
  );
});

const WatchProgressDisplay = React.memo(({ 
  watchProgress, 
  type, 
  getEpisodeDetails,
  isWatched
}: {
  watchProgress: { 
    currentTime: number; 
    duration: number; 
    lastUpdated: number; 
    episodeId?: string;
    traktSynced?: boolean;
    traktProgress?: number;
  } | null;
  type: 'movie' | 'series';
  getEpisodeDetails: (episodeId: string) => { seasonNumber: string; episodeNumber: string; episodeName: string } | null;
  isWatched: boolean;
}) => {
  const { currentTheme } = useTheme();
  
  if (!watchProgress || watchProgress.duration <= 0) return null;
  
  const progressPercentage = Math.min((watchProgress.currentTime / watchProgress.duration) * 100, 100);
  const isCompleted = progressPercentage >= 90;
  
  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  };
  
  const remainingTime = watchProgress.duration - watchProgress.currentTime;
  const episodeDetails = watchProgress?.episodeId ? getEpisodeDetails(watchProgress.episodeId) : null;
  
  return (
    <View style={styles.watchProgressContainer}>
      <View style={styles.progressGlassBackground}>
        {Platform.OS === 'android' && <View style={styles.androidProgressBlur} />}
        
        <View style={styles.watchProgressBarContainer}>
          <View style={styles.watchProgressBar}>
            <LinearGradient
              colors={isCompleted ? ['#00ff88', '#00cc6a'] : ['#fff', '#e0e0e0']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[
                styles.watchProgressFill,
                { width: `${progressPercentage}%` }
              ]}
            />
            
            {watchProgress.traktSynced && (
              <View style={styles.traktSyncIndicatorEnhanced}>
                <LinearGradient
                  colors={['#ed1c24', '#b91c1c']}
                  style={styles.traktIndicatorGradient}
                >
                  <MaterialIcons name="sync" size={8} color="white" />
                </LinearGradient>
              </View>
            )}
          </View>
        </View>
        
        <View style={styles.watchProgressTextContainer}>
          <View style={styles.progressInfoMain}>
            <Text style={[styles.watchProgressMainText, { color: currentTheme.colors.highEmphasis }]}>
              {isCompleted ? 'Completed' : `${Math.round(progressPercentage)}% watched`}
            </Text>
          </View>
          
          {!isCompleted && (
            <Text style={[styles.watchProgressSubText, { color: currentTheme.colors.mediumEmphasis }]}>
              {formatTime(remainingTime)} remaining
            </Text>
          )}
          
          {episodeDetails && (
            <Text style={[styles.watchProgressSubText, { color: currentTheme.colors.mediumEmphasis }]}>
              S{episodeDetails.seasonNumber}E{episodeDetails.episodeNumber} • {episodeDetails.episodeName}
            </Text>
          )}
        </View>
      </View>
    </View>
  );
});

const HeroSection: React.FC<HeroSectionProps> = ({
  metadata,
  bannerImage,
  loadingBanner,
  logoLoadError,
  watchProgress,
  type,
  getEpisodeDetails,
  handleShowStreams,
  handleToggleLibrary,
  inLibrary,
  id,
  navigation,
  getPlayButtonText,
  setBannerImage,
  setLogoLoadError,
  groupedEpisodes,
}) => {
  const { currentTheme } = useTheme();
  const [imageLoadError, setImageLoadError] = useState(false);
  
  const isWatched = useMemo(() => {
    if (!watchProgress) return false;
    return (watchProgress.currentTime / watchProgress.duration) >= 0.9;
  }, [watchProgress]);
  
  const playButtonText = getPlayButtonText();
  
  const handleImageLoad = () => {
    setImageLoadError(false);
  };
  
  const handleImageError = () => {
    setImageLoadError(true);
    logger.warn(`[HeroSection] Banner image failed to load: ${bannerImage}`);
  };
  
  return (
    <View style={[styles.heroSection, { height: height * 0.65 }]}>
      {/* Background Image */}
      {(() => {
        const fallback = (metadata && (metadata.banner || metadata.poster)) || null;
        const uriToUse = !imageLoadError && bannerImage ? bannerImage : fallback;
        return uriToUse ? (
          <Image
            source={{ uri: uriToUse }}
            style={styles.absoluteFill}
            contentFit="cover"
            transition={300}
            onLoad={handleImageLoad}
            onError={handleImageError}
          />
        ) : null;
      })()}
      
      {/* Gradient Overlay */}
      <LinearGradient
        colors={[
          'rgba(0,0,0,0.1)',
          'rgba(0,0,0,0.3)',
          'rgba(0,0,0,0.7)',
          'rgba(0,0,0,0.9)'
        ]}
        locations={[0, 0.3, 0.7, 1]}
        style={styles.heroGradient}
      >
        <View style={styles.heroContent}>
          {/* Logo or Title */}
          <View style={styles.titleLogoContainer}>
            {metadata.logo && !logoLoadError ? (
              <Image
                source={{ uri: metadata.logo }}
                style={styles.titleLogo}
                contentFit="contain"
                transition={150}
                onError={() => {
                  logger.warn(`[HeroSection] Logo failed to load: ${metadata.logo}`);
                  setLogoLoadError(true);
                }}
              />
            ) : (
              <Text style={[styles.heroTitle, { color: currentTheme.colors.highEmphasis }]}>
                {metadata.name}
              </Text>
            )}
          </View>
          
          {/* Genres */}
          {metadata.genres && metadata.genres.length > 0 && (
            <View style={styles.genreContainer}>
              {metadata.genres.slice(0, 3).map((genre: string, index: number) => (
                <React.Fragment key={genre}>
                  <Text style={[styles.genreText, { color: currentTheme.colors.mediumEmphasis }]}>
                    {genre}
                  </Text>
                  {index < Math.min(metadata.genres.length - 1, 2) && (
                    <Text style={[styles.genreDot, { color: currentTheme.colors.mediumEmphasis }]}>•</Text>
                  )}
                </React.Fragment>
              ))}
            </View>
          )}
          
          {/* Watch Progress */}
          <WatchProgressDisplay
            watchProgress={watchProgress}
            type={type}
            getEpisodeDetails={getEpisodeDetails}
            isWatched={isWatched}
          />
          
          {/* Action Buttons */}
          <ActionButtons
            handleShowStreams={handleShowStreams}
            toggleLibrary={handleToggleLibrary}
            inLibrary={inLibrary}
            type={type}
            id={id}
            navigation={navigation}
            playButtonText={playButtonText}
            isWatched={isWatched}
            watchProgress={watchProgress}
            groupedEpisodes={groupedEpisodes}
          />
        </View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  heroSection: {
    width: '100%',
    backgroundColor: '#000',
    overflow: 'hidden',
  },
  absoluteFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  heroGradient: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingBottom: 20,
  },
  heroContent: {
    padding: Platform.isTV ? 24 : 16,
    paddingTop: Platform.isTV ? 12 : 8,
    paddingBottom: Platform.isTV ? 12 : 8,
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginBottom: 4,
  },
  titleLogoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  titleLogo: {
    width: Platform.isTV ? width * 0.5 : width * 0.75,
    height: Platform.isTV ? 120 : 90,
    alignSelf: 'center',
  },
  heroTitle: {
    fontSize: Platform.isTV ? 44 : 26,
    fontWeight: '900',
    marginBottom: 8,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  genreContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 14,
    gap: 6,
  },
  genreText: {
    fontSize: Platform.isTV ? 16 : 12,
    fontWeight: '500',
    opacity: 0.9,
  },
  genreDot: {
    fontSize: Platform.isTV ? 16 : 12,
    fontWeight: '500',
    opacity: 0.6,
    marginHorizontal: 2,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    position: 'relative',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderRadius: 26,
    flex: Platform.isTV ? 0 : 1,
  },
  playButton: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  infoButton: {
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.7)',
    overflow: 'hidden',
  },
  iconButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  playButtonText: {
    color: '#000',
    fontWeight: '700',
    marginLeft: 6,
    fontSize: 15,
  },
  infoButtonText: {
    color: '#fff',
    marginLeft: 6,
    fontWeight: '600',
    fontSize: 15,
  },
  watchProgressContainer: {
    marginTop: 4,
    marginBottom: 4,
    width: '100%',
    alignItems: 'center',
    minHeight: 36,
    position: 'relative',
  },
  progressGlassBackground: {
    width: '75%',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    padding: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  androidProgressBlur: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  watchProgressBarContainer: {
    position: 'relative',
    marginBottom: 6,
  },
  watchProgressBar: {
    width: '100%',
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 1.5,
    overflow: 'hidden',
    position: 'relative',
  },
  watchProgressFill: {
    height: '100%',
    borderRadius: 1.25,
  },
  traktSyncIndicator: {
    position: 'absolute',
    right: 2,
    top: -2,
    bottom: -2,
    width: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  traktSyncIndicatorEnhanced: {
    position: 'absolute',
    right: 4,
    top: -2,
    bottom: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  watchedProgressIndicator: {
    position: 'absolute',
    right: 2,
    top: -1,
    bottom: -1,
    width: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  watchProgressTextContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  watchProgressText: {
    fontSize: 11,
    textAlign: 'center',
    opacity: 0.85,
    letterSpacing: 0.1,
    flex: 1,
  },
  traktSyncButton: {
    padding: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  blurBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 20,
  },
  androidFallbackBlur: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  blurBackgroundRound: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 25,
  },
  androidFallbackBlurRound: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  watchedIndicator: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 8,
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  watchedPlayButton: {
    backgroundColor: '#1e1e1e',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  watchedPlayButtonText: {
    color: '#fff',
    fontWeight: '700',
    marginLeft: 6,
    fontSize: 15,
  },
  progressShimmer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  completionGlow: {
    position: 'absolute',
    top: -2,
    left: -2,
    right: -2,
    bottom: -2,
    borderRadius: 4,
    backgroundColor: 'rgba(0,255,136,0.2)',
  },
  completionIndicator: {
    position: 'absolute',
    right: 4,
    top: -6,
    bottom: -6,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  completionGradient: {
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sparkleContainer: {
    position: 'absolute',
    top: -10,
    left: 0,
    right: 0,
    bottom: -10,
    borderRadius: 2,
  },
  sparkle: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressInfoMain: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  watchProgressMainText: {
    fontSize: Platform.isTV ? 14 : 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  watchProgressSubText: {
    fontSize: Platform.isTV ? 12 : 9,
    textAlign: 'center',
    opacity: 0.8,
    marginBottom: 1,
  },
  syncStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    width: '100%',
    flexWrap: 'wrap',
  },
  syncStatusText: {
    fontSize: 9,
    marginLeft: 4,
    fontWeight: '500',
  },
  traktSyncButtonEnhanced: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    overflow: 'hidden',
  },
  traktSyncButtonInline: {
    marginLeft: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    overflow: 'hidden',
  },
  syncButtonGradient: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  syncButtonGradientInline: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  traktIndicatorGradient: {
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default React.memo(HeroSection);