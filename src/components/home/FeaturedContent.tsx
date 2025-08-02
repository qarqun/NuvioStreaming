import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Platform,
  TVFocusGuideView,
  Animated
} from 'react-native';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { LinearGradient } from 'expo-linear-gradient';
import { Image as ExpoImage } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import { StreamingContent } from '../../services/catalogService';

import { logger } from '../../utils/logger';
import { useTheme } from '../../contexts/ThemeContext';
import { imageCacheService } from '../../services/imageCacheService';

interface FeaturedContentProps {
  featuredContent: StreamingContent | null;
}

// Cache to store preloaded images
const imageCache: Record<string, boolean> = {};

const { width, height } = Dimensions.get('window');

const NoFeaturedContent = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { currentTheme } = useTheme();
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={[styles.featuredContainer, { backgroundColor: currentTheme.colors.elevation1 }]}>
      <View style={styles.backgroundFallback}>
        <MaterialIcons name="movie" size={Platform.isTV ? 96 : 64} color={currentTheme.colors.mediumEmphasis} />
        <Text style={[styles.noContentText, { color: currentTheme.colors.mediumEmphasis }]}>
          No featured content available
        </Text>
        <TouchableOpacity
          style={[
            styles.exploreButton,
            { backgroundColor: currentTheme.colors.primary },
            isFocused && { transform: [{ scale: 1.05 }] }
          ]}
          onPress={() => navigation.navigate('Search')}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          hasTVPreferredFocus={true}
        >
          <Text style={styles.exploreButtonText}>Explore Content</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const FeaturedContent = ({ featuredContent }: FeaturedContentProps) => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { currentTheme } = useTheme();
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [isLogoLoading, setIsLogoLoading] = useState(false);
  const [imageError, setImageError] = useState(false);
  const focusGuideRef = useRef<any>(null);

  // Animation values for TV focus effects
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;

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



  const formatGenres = (genres: string[] | undefined) => {
    if (!genres || genres.length === 0) return '';
    return genres.slice(0, 3).join(' • ');
  };

  if (!featuredContent) {
    return <NoFeaturedContent />;
  }

  const backdropUrl = featuredContent.banner || featuredContent.poster;
  const formattedGenres = formatGenres(featuredContent.genres);

  return (
    <View style={styles.featuredContainer}>
      {/* Background Image with Parallax Effect */}
      <View style={styles.imageContainer}>
        {backdropUrl && !imageError ? (
          <Animated.View style={[
            styles.imageWrapper,
            {
              transform: [{ scale: scaleAnim }],
              opacity: opacityAnim,
            }
          ]}>
            <ExpoImage
              source={{ uri: backdropUrl }}
              style={styles.featuredImage}
              contentFit="cover"
              cachePolicy="memory-disk"
              transition={500}
              onError={() => setImageError(true)}
              placeholder={{ uri: 'https://via.placeholder.com/400x600' }}
              placeholderContentFit="cover"
            />
          </Animated.View>
        ) : (
          <View style={[styles.backgroundFallback, { backgroundColor: currentTheme.colors.elevation1 }]}>
            <MaterialIcons name="movie" size={Platform.isTV ? 96 : 64} color={currentTheme.colors.mediumEmphasis} />
          </View>
        )}
      </View>

      {/* Left Side Dark Gradient Fade */}
      <LinearGradient
        colors={[
          'rgba(0,0,0,0.9)',
          'rgba(0,0,0,0.7)',
          'rgba(0,0,0,0.4)',
          'rgba(0,0,0,0.1)',
          'transparent'
        ]}
        locations={[0, 0.25, 0.5, 0.75, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.leftGradient}
      />

      {/* Enhanced Gradient Overlay for TV */}
      <LinearGradient
        colors={Platform.isTV ? [
          'transparent',
          'rgba(0,0,0,0.2)',
          'rgba(0,0,0,0.5)',
          'rgba(0,0,0,0.8)',
          'rgba(0,0,0,0.95)'
        ] : [
          'transparent',
          'rgba(0,0,0,0.3)',
          'rgba(0,0,0,0.7)',
          'rgba(0,0,0,0.9)'
        ]}
        locations={Platform.isTV ? [0, 0.3, 0.5, 0.7, 1] : [0, 0.4, 0.7, 1]}
        style={styles.featuredGradient}
      >
        <TVFocusGuideView
          ref={focusGuideRef}
          style={styles.tvFocusGuide}
        >
          <View style={styles.featuredContentContainer}>
            {/* Logo or Title with TV Scaling - Left Aligned */}
            <View style={styles.titleContainer}>
              {logoUrl && !isLogoLoading ? (
                <ExpoImage
                  source={{ uri: logoUrl }}
                  style={[
                    styles.featuredLogo,
                    Platform.isTV && styles.featuredLogoTV
                  ]}
                  contentFit="contain"
                  cachePolicy="memory-disk"
                  transition={300}
                />
              ) : (
                <Text style={[
                  styles.featuredTitleText,
                  { color: '#FFFFFF' },
                  Platform.isTV && styles.featuredTitleTextTV
                ]} numberOfLines={Platform.isTV ? 3 : 2}>
                  {featuredContent.name}
                </Text>
              )}
            </View>

            {/* Enhanced Metadata Section */}
            <View style={styles.metadataContainer}>
              {/* Genres */}
              {formattedGenres && (
                <View style={styles.genreContainer}>
                  <Text style={[
                    styles.genreText,
                    { color: '#FFFFFF' },
                    Platform.isTV && styles.genreTextTV
                  ]}>
                    {formattedGenres}
                  </Text>
                </View>
              )}

              {/* Additional metadata for TV */}
              {Platform.isTV && featuredContent.year && (
                <View style={styles.yearContainer}>
                  <Text style={styles.yearText}>{featuredContent.year}</Text>
                </View>
              )}
            </View>


          </View>
        </TVFocusGuideView>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  featuredContainer: {
    width: '100%',
    height: Platform.isTV ? height * 0.75 : height * 0.55,
    marginTop: 0,
    marginBottom: Platform.isTV ? 24 : 12,
    position: 'relative',
    borderRadius: Platform.isTV ? 0 : 12,
    overflow: 'hidden',
    elevation: Platform.isTV ? 0 : 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: Platform.isTV ? 0 : 0.3,
    shadowRadius: Platform.isTV ? 0 : 8,
  },
  imageContainer: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
  },
  imageWrapper: {
    width: '100%',
    height: '100%',
  },
  featuredImage: {
    width: '100%',
    height: '100%',
    transform: Platform.isTV ? [{ scale: 1.02 }] : [{ scale: 1.05 }],
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
  leftGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '80%',
    height: '100%',
    zIndex: 2,
  },
  featuredGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'flex-end',
    zIndex: 3,
  },
  tvFocusGuide: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  featuredContentContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: Platform.isTV ? 60 : 20,
    paddingBottom: Platform.isTV ? 60 : 20,
    paddingTop: Platform.isTV ? 60 : 40,
  },
  titleContainer: {
    alignItems: 'flex-start',
    marginBottom: Platform.isTV ? 24 : 16,
    paddingHorizontal: 0,
    position: 'relative',
    height: Platform.isTV ? 160 : 160,
    width: '100%',
    marginLeft: Platform.isTV ? -200 : 0,
  },
  featuredLogo: {
    width: width * 0.9,
    height: 160,
    marginBottom: 0,
    alignSelf: 'flex-start',
    position: Platform.isTV ? 'absolute' : 'relative',
    left: Platform.isTV ? 0 : 'auto',
  },
  featuredLogoTV: {
    width: width * 0.8,
    height: 200,
    maxWidth: 900,
    position: 'absolute',
    left: 0,
  },
  featuredTitleText: {
    fontSize: 32,
    fontWeight: '900',
    marginBottom: 8,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
    textAlign: 'left',
    paddingHorizontal: 0,
    lineHeight: 38,
    position: Platform.isTV ? 'absolute' : 'relative',
    left: Platform.isTV ? 0 : 'auto',
  },
  featuredTitleTextTV: {
    fontSize: 52,
    lineHeight: 60,
    maxWidth: width * 0.8,
    textShadowRadius: 8,
  },
  metadataContainer: {
    alignItems: 'flex-start',
    marginBottom: Platform.isTV ? 32 : 20,
  },
  genreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginBottom: Platform.isTV ? 12 : 8,
    flexWrap: 'wrap',
    gap: Platform.isTV ? 8 : 4,
  },
  genreText: {
    fontSize: 14,
    fontWeight: '500',
    opacity: 0.9,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  genreTextTV: {
    fontSize: 18,
    fontWeight: '600',
  },
  yearContainer: {
    marginTop: 8,
  },
  yearText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
    opacity: 0.8,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },

  noContentText: {
    fontSize: Platform.isTV ? 20 : 16,
    fontWeight: '500',
    marginTop: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  exploreButton: {
    paddingHorizontal: Platform.isTV ? 32 : 24,
    paddingVertical: Platform.isTV ? 16 : 12,
    borderRadius: Platform.isTV ? 12 : 8,
    borderWidth: 0,
  },
  exploreButtonText: {
    color: '#FFFFFF',
    fontSize: Platform.isTV ? 18 : 16,
    fontWeight: '600',
  },
});

export default React.memo(FeaturedContent);