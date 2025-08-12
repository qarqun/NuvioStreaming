import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Dimensions } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn } from 'react-native-reanimated';
import { CatalogContent, StreamingContent } from '../../services/catalogService';
import { useTheme } from '../../contexts/ThemeContext';
import ContentItem from './ContentItem';
import { RootStackParamList } from '../../navigation/AppNavigator';

interface CatalogSectionProps {
  catalog: CatalogContent;
  onPosterPress?: (content: StreamingContent) => void;
  onPosterFocus?: (content: StreamingContent) => void;
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

const CatalogSection = ({ catalog, onPosterPress, onPosterFocus }: CatalogSectionProps) => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { currentTheme } = useTheme();

  const handleContentPress = (id: string, type: string) => {
    const content = catalog.items.find(item => item.id === id && item.type === type);
    if (content && onPosterPress) {
      onPosterPress(content);
    } else {
      navigation.navigate('Metadata', { id, type, addonId: catalog.addon });
    }
  };

  const renderContentItem = ({ item, index }: { item: StreamingContent, index: number }) => {
    return (
      <Animated.View
        entering={FadeIn.duration(300).delay(100 + (index * 40))}
      >
        <ContentItem 
          item={item} 
          onPress={handleContentPress}
          onFocusItem={onPosterFocus}
        />
      </Animated.View>
    );
  };

  return (
    <Animated.View 
      style={styles.catalogContainer}
      entering={FadeIn.duration(300).delay(50)}
    >
      <View style={styles.catalogHeader}>
        <View style={styles.titleContainer}>
          <Text style={[styles.catalogTitle, { color: currentTheme.colors.text }]} numberOfLines={1}>{catalog.name}</Text>
          <View style={[styles.titleUnderline, { backgroundColor: currentTheme.colors.primary }]} />
        </View>
        <TouchableOpacity
          onPress={() => 
            navigation.navigate('Catalog', {
              id: catalog.id,
              type: catalog.type,
              addonId: catalog.addon
            })
          }
          style={styles.viewAllButton}
        >
          <Text style={[styles.viewAllText, { color: currentTheme.colors.textMuted }]}>View All</Text>
          <MaterialIcons name="chevron-right" size={20} color={currentTheme.colors.textMuted} />
        </TouchableOpacity>
      </View>
      
      <FlashList
        data={catalog.items}
        renderItem={renderContentItem}
        keyExtractor={(item) => `${item.id}-${item.type}`}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.catalogList, { paddingRight: 16 - posterLayout.partialPosterWidth }]}
        snapToInterval={POSTER_WIDTH + 8}
        decelerationRate="fast"
        snapToAlignment="start"
        ItemSeparatorComponent={() => <View style={{ width: 8 }} />}
        estimatedItemSize={POSTER_WIDTH + 8}
        onEndReachedThreshold={1}
        // TV-specific focus navigation properties
        {...(Platform.isTV && {
          directionalLockEnabled: true,
          horizontal: true,
          scrollEnabled: true,
          focusable: false,
          tvParallaxProperties: {
            enabled: false,
          },
        })}
      />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  catalogContainer: {
    marginBottom: 28,
    overflow: 'visible',
    paddingVertical: Platform.isTV ? 8 : 0,
  },
  catalogHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  titleContainer: {
    position: 'relative',
    flex: 1,
    marginRight: 16,
  },
  catalogTitle: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  titleUnderline: {
    position: 'absolute',
    bottom: -2,
    left: 0,
    width: 40,
    height: 3,
    borderRadius: 2,
    opacity: 0.8,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600',
    marginRight: 4,
  },
  catalogList: {
    paddingHorizontal: 16,
    paddingVertical: Platform.isTV ? 12 : 0,
    overflow: 'visible',
  },
});

export default React.memo(CatalogSection);