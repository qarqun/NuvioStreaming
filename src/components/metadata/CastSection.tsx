import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import Animated, {
  FadeIn,
} from 'react-native-reanimated';
import { useTheme } from '../../contexts/ThemeContext';

interface CastSectionProps {
  cast: any[];
  loadingCast: boolean;
  onSelectCastMember: (castMember: any) => void;
}

export const CastSection: React.FC<CastSectionProps> = ({
  cast,
  loadingCast,
  onSelectCastMember,
}) => {
  const { currentTheme } = useTheme();

  if (loadingCast) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={currentTheme.colors.primary} />
      </View>
    );
  }

  if (!cast || cast.length === 0) {
    return null;
  }

  return (
    <Animated.View 
      style={styles.castSection}
      entering={FadeIn.duration(300).delay(150)}
    >
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: currentTheme.colors.highEmphasis }]}>Cast</Text>
      </View>
      <FlatList
        horizontal
        data={cast}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.castList}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item, index }) => (
          <Animated.View 
            entering={FadeIn.duration(300).delay(50 + index * 30)} 
          >
            <TouchableOpacity 
              style={styles.castCard}
              onPress={() => onSelectCastMember(item)}
              activeOpacity={0.7}
            >
              <View style={styles.castImageContainer}>
                {item.profile_path ? (
                  <Image
                    source={{
                      uri: `https://image.tmdb.org/t/p/w185${item.profile_path}`,
                    }}
                    style={styles.castImage}
                    contentFit="cover"
                    transition={200}
                  />
                ) : (
                  <View style={[styles.castImagePlaceholder, { backgroundColor: currentTheme.colors.darkBackground }]}>
                    <Text style={[styles.placeholderText, { color: currentTheme.colors.textMuted }]}>
                      {item.name.split(' ').reduce((prev: string, current: string) => prev + current[0], '').substring(0, 2)}
                    </Text>
                  </View>
                )}
              </View>
              <Text style={[styles.castName, { color: currentTheme.colors.text }]} numberOfLines={1}>{item.name}</Text>
              {item.character && (
                <Text style={[styles.characterName, { color: currentTheme.colors.textMuted }]} numberOfLines={1}>{item.character}</Text>
              )}
            </TouchableOpacity>
          </Animated.View>
        )}
      />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  castSection: {
    marginBottom: 24,
    paddingHorizontal: 0,
  },
  loadingContainer: {
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 24,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '800',
  },
  castList: {
    paddingHorizontal: 24,
    paddingBottom: 8,
  },
  castCard: {
    marginRight: 20,
    width: 110,
    alignItems: 'center',
  },
  castImageContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    overflow: 'hidden',
    marginBottom: 10,
  },
  castImage: {
    width: '100%',
    height: '100%',
  },
  castImagePlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    fontSize: 28,
    fontWeight: '700',
  },
  castName: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    width: 110,
  },
  characterName: {
    fontSize: 13,
    textAlign: 'center',
    width: 110,
    marginTop: 4,
  },
}); 