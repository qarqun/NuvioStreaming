/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { Provider as PaperProvider } from 'react-native-paper';
import { enableScreens } from 'react-native-screens';
import AppNavigator, { 
  CustomNavigationDarkTheme,
  CustomDarkTheme
} from './src/navigation/AppNavigator';
// Removed react-native-reanimated import
import { CatalogProvider } from './src/contexts/CatalogContext';
import { GenreProvider } from './src/contexts/GenreContext';
import { TraktProvider } from './src/contexts/TraktContext';
import { ThemeProvider, useTheme } from './src/contexts/ThemeContext';
import SplashScreen from './src/components/SplashScreen';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Sentry from '@sentry/react-native';

Sentry.init({
  dsn: 'https://1a58bf436454d346e5852b7bfd3c95e8@o4509536317276160.ingest.de.sentry.io/4509536317734992',

  // Adds more context data to events (IP address, cookies, user, etc.)
  // For more information, visit: https://docs.sentry.io/platforms/react-native/data-management/data-collected/
  sendDefaultPii: true,

  // Configure Session Replay
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1,
  integrations: [Sentry.mobileReplayIntegration(), Sentry.feedbackIntegration()],

  // uncomment the line below to enable Spotlight (https://spotlightjs.com)
  // spotlight: __DEV__,
});

// This fixes many navigation layout issues by using native screen containers
enableScreens(true);

// Inner app component that uses the theme context
const ThemedApp = () => {
  const { currentTheme } = useTheme();
  const [isAppReady, setIsAppReady] = useState(false);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState<boolean | null>(null);
  
  // Check onboarding status
  useEffect(() => {
    const checkOnboardingStatus = async () => {
      try {
        const onboardingCompleted = await AsyncStorage.getItem('hasCompletedOnboarding');
        setHasCompletedOnboarding(onboardingCompleted === 'true');
      } catch (error) {
        console.error('Error checking onboarding status:', error);
        // Default to showing onboarding if we can't check
        setHasCompletedOnboarding(false);
      }
    };
    
    checkOnboardingStatus();
  }, []);
  
  // Create custom themes based on current theme
  const customDarkTheme = {
    ...CustomDarkTheme,
    colors: {
      ...CustomDarkTheme.colors,
      primary: currentTheme.colors.primary,
    }
  };
  
  const customNavigationTheme = {
    ...CustomNavigationDarkTheme,
    colors: {
      ...CustomNavigationDarkTheme.colors,
      primary: currentTheme.colors.primary,
      card: currentTheme.colors.darkBackground,
      background: currentTheme.colors.darkBackground,
    }
  };

  // Handler for splash screen completion  
  const handleSplashComplete = () => {
    setIsAppReady(true);
  };
  
  // Don't render anything until we know the onboarding status
  const shouldShowApp = isAppReady && hasCompletedOnboarding !== null;
  const initialRouteName = hasCompletedOnboarding ? 'MainTabs' : 'Onboarding';
  
  return (
    <PaperProvider theme={customDarkTheme}>
      <NavigationContainer 
        theme={customNavigationTheme}
        // Disable automatic linking which can cause layout issues
        linking={undefined}
      >
        <View style={[styles.container, { backgroundColor: currentTheme.colors.darkBackground }]}>
          <StatusBar
            style="light"
          />
          {!isAppReady && <SplashScreen onFinish={handleSplashComplete} />}
          {shouldShowApp && <AppNavigator initialRouteName={initialRouteName} />}
        </View>
      </NavigationContainer>
    </PaperProvider>
  );
}

function App(): React.JSX.Element {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <GenreProvider>
        <CatalogProvider>
          <TraktProvider>
            <ThemeProvider>
              <ThemedApp />
            </ThemeProvider>
          </TraktProvider>
        </CatalogProvider>
      </GenreProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default Sentry.wrap(App);