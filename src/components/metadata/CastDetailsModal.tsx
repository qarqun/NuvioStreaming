import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Dimensions,
  Platform,
  Modal,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../contexts/ThemeContext';
import { Cast } from '../../types/cast';
import { tmdbService } from '../../services/tmdbService';

interface CastDetailsModalProps {
  visible: boolean;
  onClose: () => void;
  castMember: Cast | null;
}

const { width, height } = Dimensions.get('window');
const MODAL_WIDTH = Math.min(width - 40, 400);
const MODAL_HEIGHT = height * 0.7;

interface PersonDetails {
  id: number;
  name: string;
  biography: string;
  birthday: string | null;
  place_of_birth: string | null;
  known_for_department: string;
  profile_path: string | null;
  also_known_as: string[];
}

export const CastDetailsModal: React.FC<CastDetailsModalProps> = ({
  visible,
  onClose,
  castMember,
}) => {
  const { currentTheme } = useTheme();
  const [personDetails, setPersonDetails] = useState<PersonDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible && castMember?.id) {
      fetchPersonDetails();
    }
  }, [visible, castMember?.id]);

  const fetchPersonDetails = async () => {
    if (!castMember?.id) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const details = await tmdbService.getPersonDetails(castMember.id);
      setPersonDetails(details);
    } catch (err) {
      console.error('Error fetching person details:', err);
      setError('Failed to load cast member details');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return null;
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  const calculateAge = (birthday: string | null) => {
    if (!birthday) return null;
    try {
      const birthDate = new Date(birthday);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      return age;
    } catch {
      return null;
    }
  };

  if (!visible || !castMember) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity 
          style={styles.backdrop} 
          activeOpacity={1} 
          onPress={onClose}
        />
        
        <View style={[styles.modalContainer, { backgroundColor: currentTheme.colors.darkBackground }]}>
          {Platform.OS === 'ios' ? (
            <BlurView intensity={80} style={styles.blurBackground} tint="dark" />
          ) : (
            <View style={[styles.androidBackground, { backgroundColor: currentTheme.colors.darkBackground }]} />
          )}
          
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.headerTitle, { color: currentTheme.colors.highEmphasis }]}>
              Cast Details
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <MaterialIcons name="close" size={24} color={currentTheme.colors.highEmphasis} />
            </TouchableOpacity>
          </View>
          
          {/* Content */}
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={currentTheme.colors.primary} />
                <Text style={[styles.loadingText, { color: currentTheme.colors.mediumEmphasis }]}>
                  Loading details...
                </Text>
              </View>
            ) : error ? (
              <View style={styles.errorContainer}>
                <MaterialIcons name="error-outline" size={48} color={currentTheme.colors.error} />
                <Text style={[styles.errorText, { color: currentTheme.colors.error }]}>
                  {error}
                </Text>
                <TouchableOpacity onPress={fetchPersonDetails} style={[styles.retryButton, { backgroundColor: currentTheme.colors.primary }]}>
                  <Text style={styles.retryButtonText}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : personDetails ? (
              <View style={styles.detailsContainer}>
                {/* Profile Image and Basic Info */}
                <View style={styles.profileSection}>
                  <View style={styles.imageContainer}>
                    {personDetails.profile_path ? (
                      <Image
                        source={{ uri: `https://image.tmdb.org/t/p/w500${personDetails.profile_path}` }}
                        style={styles.profileImage}
                        contentFit="cover"
                      />
                    ) : (
                      <View style={[styles.placeholderImage, { backgroundColor: currentTheme.colors.elevation1 }]}>
                        <MaterialIcons name="person" size={60} color={currentTheme.colors.mediumEmphasis} />
                      </View>
                    )}
                  </View>
                  
                  <View style={styles.basicInfo}>
                    <Text style={[styles.name, { color: currentTheme.colors.highEmphasis }]}>
                      {personDetails.name}
                    </Text>
                    
                    <Text style={[styles.department, { color: currentTheme.colors.primary }]}>
                      {personDetails.known_for_department}
                    </Text>
                    
                    {personDetails.birthday && (
                      <View style={styles.infoRow}>
                        <MaterialIcons name="cake" size={16} color={currentTheme.colors.mediumEmphasis} />
                        <Text style={[styles.infoText, { color: currentTheme.colors.mediumEmphasis }]}>
                          {formatDate(personDetails.birthday)}
                          {calculateAge(personDetails.birthday) && ` (${calculateAge(personDetails.birthday)} years old)`}
                        </Text>
                      </View>
                    )}
                    
                    {personDetails.place_of_birth && (
                      <View style={styles.infoRow}>
                        <MaterialIcons name="place" size={16} color={currentTheme.colors.mediumEmphasis} />
                        <Text style={[styles.infoText, { color: currentTheme.colors.mediumEmphasis }]}>
                          {personDetails.place_of_birth}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
                
                {/* Biography */}
                {personDetails.biography && (
                  <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: currentTheme.colors.highEmphasis }]}>
                      Biography
                    </Text>
                    <Text style={[styles.biography, { color: currentTheme.colors.mediumEmphasis }]}>
                      {personDetails.biography}
                    </Text>
                  </View>
                )}
                
                {/* Also Known As */}
                {personDetails.also_known_as && personDetails.also_known_as.length > 0 && (
                  <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: currentTheme.colors.highEmphasis }]}>
                      Also Known As
                    </Text>
                    <View style={styles.aliasContainer}>
                      {personDetails.also_known_as.slice(0, 5).map((alias, index) => (
                        <View key={index} style={[styles.aliasChip, { backgroundColor: currentTheme.colors.elevation1 }]}>
                          <Text style={[styles.aliasText, { color: currentTheme.colors.mediumEmphasis }]}>
                            {alias}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
              </View>
            ) : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = {
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  backdrop: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContainer: {
    width: MODAL_WIDTH,
    height: MODAL_HEIGHT,
    borderRadius: 16,
    overflow: 'hidden' as const,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  blurBackground: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  androidBackground: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.95,
  },
  header: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    paddingVertical: 40,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    textAlign: 'center' as const,
    marginBottom: 20,
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600' as const,
  },
  detailsContainer: {
    flex: 1,
  },
  profileSection: {
    flexDirection: 'row' as const,
    marginBottom: 24,
  },
  imageContainer: {
    marginRight: 16,
  },
  profileImage: {
    width: 100,
    height: 150,
    borderRadius: 8,
  },
  placeholderImage: {
    width: 100,
    height: 150,
    borderRadius: 8,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  basicInfo: {
    flex: 1,
    justifyContent: 'flex-start' as const,
  },
  name: {
    fontSize: 24,
    fontWeight: '700' as const,
    marginBottom: 4,
  },
  department: {
    fontSize: 16,
    fontWeight: '600' as const,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    marginBottom: 12,
  },
  biography: {
    fontSize: 14,
    lineHeight: 20,
  },
  aliasContainer: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 8,
  },
  aliasChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  aliasText: {
    fontSize: 12,
    fontWeight: '500' as const,
  },
};

export default CastDetailsModal;