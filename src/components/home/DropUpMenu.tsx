import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TouchableOpacity,
  useColorScheme,
  Dimensions,
  Platform
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import { colors } from '../../styles/colors';
import { StreamingContent } from '../../services/catalogService';

interface DropUpMenuProps {
  visible: boolean;
  onClose: () => void;
  item: StreamingContent;
  onOptionSelect: (option: string) => void;
}

export const DropUpMenu = ({ visible, onClose, item, onOptionSelect }: DropUpMenuProps) => {
  const isDarkMode = useColorScheme() === 'dark';

  const menuOptions = [
    { id: 'play', label: 'Play', icon: 'play-arrow' },
    { id: 'info', label: 'More Info', icon: 'info-outline' },
    { id: 'save', label: 'Add to My List', icon: 'bookmark-border' },
    { id: 'share', label: 'Share', icon: 'share' },
  ];

  const handleOptionPress = (optionId: string) => {
    onOptionSelect(optionId);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <Pressable style={styles.modalOverlayPressable} onPress={onClose} />
        
        <View style={[
          styles.menuContainer,
          { backgroundColor: isDarkMode ? colors.darkBackground : colors.lightBackground }
        ]}>
          {/* Drag Handle */}
          <View style={styles.dragHandle} />
          
          {/* Header with item info */}
          <View style={styles.menuHeader}>
            <ExpoImage
              source={{ uri: item.poster || 'https://via.placeholder.com/300x450' }}
              style={styles.menuPoster}
              contentFit="cover"
              cachePolicy="memory"
            />
            <View style={styles.menuTitleContainer}>
              <Text style={[
                styles.menuTitle,
                { color: isDarkMode ? colors.white : colors.black }
              ]} numberOfLines={2}>
                {item.name}
              </Text>
              {item.year && (
                <Text style={[
                  styles.menuYear,
                  { color: isDarkMode ? colors.textMuted : colors.textMutedDark }
                ]}>
                  {item.year}
                </Text>
              )}
            </View>
          </View>
          
          {/* Menu Options */}
          <View style={styles.menuOptions}>
            {menuOptions.map((option, index) => (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.menuOption,
                  { borderBottomColor: isDarkMode ? colors.border : colors.border },
                  index === menuOptions.length - 1 && styles.lastMenuOption
                ]}
                onPress={() => handleOptionPress(option.id)}
                activeOpacity={0.7}
              >
                <MaterialIcons
                  name={option.icon as any}
                  size={24}
                  color={isDarkMode ? colors.white : colors.black}
                />
                <Text style={[
                  styles.menuOptionText,
                  { color: isDarkMode ? colors.white : colors.black }
                ]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: colors.transparentDark,
  },
  modalOverlayPressable: {
    flex: 1,
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: colors.transparentLight,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 10,
  },
  menuContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: Platform.select({ ios: 40, android: 24 }),
    ...Platform.select({
      ios: {
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.1,
        shadowRadius: 5,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  menuHeader: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  menuPoster: {
    width: 60,
    height: 90,
    borderRadius: 12,
  },
  menuTitleContainer: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  menuYear: {
    fontSize: 14,
  },
  menuOptions: {
    paddingTop: 8,
  },
  menuOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  lastMenuOption: {
    borderBottomWidth: 0,
  },
  menuOptionText: {
    fontSize: 16,
    marginLeft: 16,
  },
});

export default DropUpMenu;