import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, TouchableOpacity, ActivityIndicator, StyleSheet, Dimensions, Platform, Text, Animated } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { catalogService, StreamingContent } from '../../services/catalogService';
import { DropUpMenu } from './DropUpMenu';

interface ContentItemProps {
  item: StreamingContent;
  onPress: (id: string, type: string) => void;
  onFocusItem?: (item: StreamingContent) => void;
}

const { width } = Dimensions.get('window');

// Dynamic poster calculation based on screen width - show 1/4 of next poster
const calculatePosterLayout = (screenWidth: number) => {
  // TV gets larger posters
  const MIN_POSTER_WIDTH = Platform.isTV ? 140 : 100;
  const MAX_POSTER_WIDTH = Platform.isTV ? 180 : 130;
  const LEFT_PADDING = 16; // Left padding
  const SPACING = 8; // Space between posters
  
  // Calculate available width for posters (reserve space for left padding)
  const availableWidth = screenWidth - LEFT_PADDING;
  
  // Try different numbers of full posters to find the best fit
  let bestLayout = { numFullPosters: 3, posterWidth: Platform.isTV ? 160 : 120 };
  
  for (let n = 3; n <= 6; n++) {
    // Calculate poster width needed for N full posters + 0.25 partial poster
    // Formula: N * posterWidth + (N-1) * spacing + 0.25 * posterWidth = availableWidth - rightPadding
    // Simplified: posterWidth * (N + 0.25) + (N-1) * spacing = availableWidth - rightPadding
    // We'll use minimal right padding (8px) to maximize space
    const usableWidth = availableWidth - 8;
    const posterWidth = (usableWidth - (n - 1) * SPACING) / (n + 0.25);
    
    if (posterWidth >= MIN_POSTER_WIDTH && posterWidth <= MAX_POSTER_WIDTH) {
      bestLayout = { numFullPosters: n, posterWidth };
    }
  }
  
  return {
    numFullPosters: bestLayout.numFullPosters,
    posterWidth: bestLayout.posterWidth,
    spacing: SPACING,
    partialPosterWidth: bestLayout.posterWidth * 0.25 // 1/4 of next poster
  };
};

const posterLayout = calculatePosterLayout(width);
const POSTER_WIDTH = posterLayout.posterWidth;

const ContentItem = React.memo(({ item, onPress, onFocusItem }: ContentItemProps) => {
  const [menuVisible, setMenuVisible] = useState(false);
  const [isWatched, setIsWatched] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const { currentTheme } = useTheme();
  
  // Animation values for TV focus effects
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handleLongPress = useCallback(() => {
    setMenuVisible(true);
  }, []);

  const handlePress = useCallback(() => {
    onPress(item.id, item.type);
  }, [item.id, item.type, onPress]);

  const handleOptionSelect = useCallback((option: string) => {
    switch (option) {
      case 'library':
        if (item.inLibrary) {
          catalogService.removeFromLibrary(item.type, item.id);
        } else {
          catalogService.addToLibrary(item);
        }
        break;
      case 'watched':
        setIsWatched(prev => !prev);
        break;
      case 'playlist':
        break;
      case 'share':
        break;
    }
  }, [item]);

  const handleMenuClose = useCallback(() => {
    setMenuVisible(false);
  }, []);

  // TV Focus handlers
  const handleFocus = useCallback(() => {
    if (Platform.isTV) {
      setIsFocused(true);
      Animated.spring(scaleAnim, {
        toValue: 1.15,
        useNativeDriver: true,
        tension: 80,
        friction: 6,
      }).start();
    }
    if (onFocusItem) {
      onFocusItem(item);
    }
  }, [scaleAnim]);

  const handleBlur = useCallback(() => {
    if (Platform.isTV) {
      setIsFocused(false);
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 80,
        friction: 6,
      }).start();
    }
  }, [scaleAnim]);

  // Dynamic styles for focus effects
  const animatedContainerStyle = {
    transform: [{ scale: scaleAnim }],
    zIndex: isFocused && Platform.isTV ? 10 : 1,
  };

  return (
    <>
      <View style={styles.itemContainer}>
        <Animated.View style={animatedContainerStyle}>
          <TouchableOpacity
            style={styles.contentItem}
            activeOpacity={0.7}
            onPress={handlePress}
            onLongPress={handleLongPress}
            delayLongPress={300}
            onFocus={handleFocus}
            onBlur={handleBlur}
            hasTVPreferredFocus={false}
          >
              <View style={styles.contentItemContainer}>
                <ExpoImage
                  source={{ uri: item.poster || 'https://via.placeholder.com/300x450' }}
                  style={styles.poster}
                  contentFit="cover"
                  cachePolicy="memory"
                  transition={200}
                  placeholder={{ uri: 'https://via.placeholder.com/300x450' }}
                  placeholderContentFit="cover"
                  recyclingKey={item.id}
                />
                {isWatched && (
                  <View style={styles.watchedIndicator}>
                    <MaterialIcons name="check-circle" size={22} color={currentTheme.colors.success} />
                  </View>
                )}
                {item.inLibrary && (
                  <View style={styles.libraryBadge}>
                    <MaterialIcons name="bookmark" size={16} color={currentTheme.colors.white} />
                  </View>
                )}
              </View>
           </TouchableOpacity>
         </Animated.View>
        <Text style={[styles.title, { color: currentTheme.colors.text }]} numberOfLines={2}>
          {item.name}
        </Text>
      </View>
      
      <DropUpMenu
        visible={menuVisible}
        onClose={handleMenuClose}
        item={item}
        onOptionSelect={handleOptionSelect}
      />
    </>
  );
});

const styles = StyleSheet.create({
  itemContainer: {
    width: POSTER_WIDTH,
  },
  contentItem: {
    width: POSTER_WIDTH,
    aspectRatio: 2/3,
    margin: 0,
    borderRadius: 4,
    overflow: 'hidden',
    position: 'relative',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.12)',
    marginBottom: 8,
  },
  contentItemContainer: {
    width: '100%',
    height: '100%',
    borderRadius: 4,
    overflow: 'hidden',
    position: 'relative',
  },
  poster: {
    width: '100%',
    height: '100%',
    borderRadius: 4,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  watchedIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    borderRadius: 12,
    padding: 2,
  },
  libraryBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    borderRadius: 8,
    padding: 4,
  },
  title: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 4,
    textAlign: 'center',
    fontFamily: 'SpaceMono-Regular',
  }
});

export default ContentItem;