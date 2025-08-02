import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ImageBackground,
  Dimensions,
  ViewStyle,
  TextStyle,
  ImageStyle,
  ActivityIndicator,
  Platform
} from 'react-native';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { LinearGradient } from 'expo-linear-gradient';
import { Image as ExpoImage } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import { StreamingContent } from '../../services/catalogService';
import { SkeletonFeatured } from './SkeletonLoaders';
import { isValidMetahubLogo, hasValidLogoFormat, isMetahubUrl, isTmdbUrl } from '../../utils/logoUtils';
import { useSettings } from '../../hooks/useSettings';
import { TMDBService } from '../../services/tmdbService';
import { logger } from '../../utils/logger';
import { useTheme } from '../../contexts/ThemeContext';
import { imageCacheService } from '../../services/imageCacheService';

interface FeaturedContentProps {
  featuredContent: StreamingContent | null;
  isSaved: boolean;
  handleSaveToLibrary: () => void;
}

// Cache to store preloaded images
const imageCache: Record<string, boolean> = {};

const { width, height } = Dimensions.get('window');

const NoFeaturedContent = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { currentTheme } = useTheme();

  return (
    <View style={[styles.featuredContainer, { backgroundColor: currentTheme.colors.elevation1 }]}>
      <View style={styles.backgroundFallback}>
        <MaterialIcons name="movie" size={64} color={currentTheme.colors.mediumEmphasis} />
        <Text style={[styles.noContentText, { color: currentTheme.colors.mediumEmphasis }]}>
          No featured content available
        </Text>
        <TouchableOpacity
          style={[styles.exploreButton, { backgroundColor: currentTheme.colors.primary }]}
          onPress={() => navigation.navigate('Search')}
        >
          <Text style={styles.exploreButtonText}>Explore Content</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const FeaturedContent = ({ featuredContent, isSaved, handleSaveToLibrary }: FeaturedContentProps) => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { currentTheme } = useTheme();
  const { settings } = useSettings();
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [isLogoLoading, setIsLogoLoading] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  // Removed TMDB service integration

  // Preload image when component mounts
  useEffect(() => {
    if (featuredContent?.poster && !imageCache[featuredContent.poster]) {
      const preloadImage = async () => {
        try {
          await imageCacheService.getCachedImageUrl(featuredContent.poster!);
          imageCache[featuredContent.poster!] = true;
        } catch (error) {
          logger.error('Failed to preload featured image:', error);
        }
      };
      preloadImage();
    }
  }, [featuredContent?.poster]);

  // TMDB data fetching removed due to API limitations

  // Fetch logo when featured content changes
  useEffect(() => {
    const fetchLogo = async () => {
      if (!featuredContent || isLogoLoading) return;
      
      setIsLogoLoading(true);
      setLogoUrl(null);
      
      try {
        // Use existing logo logic
        if (featuredContent.logo) {
          setLogoUrl(featuredContent.logo);
        }
      } catch (error) {
        logger.error('Error fetching logo:', error);
      } finally {
        setIsLogoLoading(false);
      }
    };

    fetchLogo();
   }, [featuredContent]);

  const handlePlayPress = () => {
    if (featuredContent) {
      navigation.navigate('Metadata', {
         id: featuredContent.id,
         type: featuredContent.type
       });
    }
  };

  const handleInfoPress = () => {
    if (featuredContent) {
      navigation.navigate('Metadata', {
         id: featuredContent.id,
         type: featuredContent.type
       });
    }
  };

  const formatGenres = (genres: string[] | undefined) => {
    if (!genres || genres.length === 0) return '';
    return genres.slice(0, 3).join(' • ');
  };

  if (!featuredContent) {
    return <NoFeaturedContent />;
  }

  const posterUrl = featuredContent.poster;
  const formattedGenres = formatGenres(featuredContent.genres);

  return (
    <View style={styles.featuredContainer}>
      {/* Background Image */}
      <View style={styles.imageContainer}>
        {posterUrl && !imageError ? (
          <ExpoImage
            source={{ uri: posterUrl }}
            style={styles.featuredImage}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={300}
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageError(true)}
            placeholder={{ uri: 'https://via.placeholder.com/400x600' }}
            placeholderContentFit="cover"
          />
        ) : (
          <View style={[styles.backgroundFallback, { backgroundColor: currentTheme.colors.elevation1 }]}>
            <MaterialIcons name="movie" size={64} color={currentTheme.colors.mediumEmphasis} />
          </View>
        )}
      </View>

      {/* Content Overlay */}
      <View style={styles.contentOverlay} />

      {/* Gradient Overlay */}
      <LinearGradient
        colors={[
          'transparent',
          'rgba(0,0,0,0.3)',
          'rgba(0,0,0,0.7)',
          'rgba(0,0,0,0.9)'
        ]}
        locations={[0, 0.4, 0.7, 1]}
        style={styles.featuredGradient}
      >
        <View style={styles.featuredContentContainer}>
          {/* Logo or Title */}
          {logoUrl && !isLogoLoading ? (
            <ExpoImage
              source={{ uri: logoUrl }}
              style={styles.featuredLogo}
              contentFit="contain"
              cachePolicy="memory-disk"
              transition={200}
            />
          ) : (
            <Text style={[styles.featuredTitleText, { color: '#FFFFFF' }]} numberOfLines={2}>
               {featuredContent.name}
             </Text>
          )}

          {/* Genres */}
          {formattedGenres && (
            <View style={styles.genreContainer}>
              <Text style={[styles.genreText, { color: '#FFFFFF' }]}>
                {formattedGenres}
              </Text>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.featuredButtons}>
            {/* Play Button */}
            <TouchableOpacity
              style={[styles.playButton, { backgroundColor: '#FFFFFF' }]}
              onPress={handlePlayPress}
              activeOpacity={0.8}
            >
              <MaterialIcons name="play-arrow" size={20} color="#000000" />
              <Text style={[styles.playButtonText, { color: '#000000' }]}>Play</Text>
            </TouchableOpacity>

            {/* My List Button */}
            <TouchableOpacity
              style={styles.myListButton}
              onPress={handleSaveToLibrary}
              activeOpacity={0.7}
            >
              <MaterialIcons
                name={isSaved ? "check" : "add"}
                size={20}
                color="#FFFFFF"
              />
              <Text style={[styles.myListButtonText, { color: '#FFFFFF' }]}>
                {isSaved ? 'Saved' : 'My List'}
              </Text>
            </TouchableOpacity>

            {/* Info Button */}
            <TouchableOpacity
              style={styles.infoButton}
              onPress={handleInfoPress}
              activeOpacity={0.7}
            >
              <MaterialIcons name="info-outline" size={20} color="#FFFFFF" />
              <Text style={[styles.infoButtonText, { color: '#FFFFFF' }]}>Info</Text>
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  featuredContainer: {
    width: '100%',
    height: height * 0.55,
    marginTop: 0,
    marginBottom: 12,
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  imageContainer: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 2,
  },
  featuredImage: {
    width: '100%',
    height: '100%',
    transform: [{ scale: 1.05 }],
  },
  backgroundFallback: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  featuredGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'space-between',
    paddingTop: 20,
  },
  featuredContentContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingBottom: 8,
    paddingTop: 40,
  },
  featuredLogo: {
    width: width * 0.7,
    height: 100,
    marginBottom: 0,
    alignSelf: 'center',
  },
  featuredTitleText: {
    fontSize: 28,
    fontWeight: '900',
    marginBottom: 8,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  genreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    flexWrap: 'wrap',
    gap: 4,
  },
  genreText: {
    fontSize: 14,
    fontWeight: '500',
    opacity: 0.9,
  },
  genreDot: {
    fontSize: 14,
    fontWeight: '500',
    opacity: 0.6,
    marginHorizontal: 4,
  },
  featuredButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    width: '100%',
    minHeight: 70,
    paddingTop: 12,
    paddingBottom: 20,
    paddingHorizontal: 8,
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 30,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    flex: 0,
    width: 140,
  },
  myListButton: {
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 0,
    gap: 6,
    width: 44,
    height: 44,
    flex: undefined,
  },
  infoButton: {
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 0,
    gap: 4,
    width: 44,
    height: 44,
    flex: undefined,
  },
  playButtonText: {
    fontWeight: '600',
    marginLeft: 8,
    fontSize: 16,
  },
  myListButtonText: {
    fontSize: 12,
    fontWeight: '500',
  },
  infoButtonText: {
    fontSize: 12,
    fontWeight: '500',
  },
  contentOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.15)',
    zIndex: 1,
    pointerEvents: 'none',
  },
  noContentText: {
    fontSize: 16,
    fontWeight: '500',
    marginTop: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  exploreButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  exploreButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default React.memo(FeaturedContent);