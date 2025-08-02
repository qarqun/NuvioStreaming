# Nuvio TV Setup Guide

This project has been configured to support both mobile (Android/iOS) and TV (Android TV/Apple TV) platforms using React Native TV.

## Prerequisites

### For Apple TV Development
- Xcode with tvOS SDK 17 or later
- Install tvOS SDK: `xcodebuild -downloadAllPlatforms`
- Apple TV simulator or physical Apple TV device

### For Android TV Development
- Android Studio with Android TV emulator
- Android TV device or emulator with API level 24+

## Key Changes Made

1. **React Native TV Package**: Replaced `react-native` with `react-native-tvos` package
2. **TV Config Plugin**: Added `@react-native-tvos/config-tv` plugin for automatic TV configuration
3. **Removed expo-dev-client**: Not supported on TV platforms
4. **EAS Build Configuration**: Added TV-specific build profiles
5. **Package.json Scripts**: Added TV-specific development commands

## Development Commands

### Mobile Development (Original)
```bash
npm run start          # Start Expo development server
npm run ios            # Run on iOS simulator
npm run android        # Run on Android emulator
```

### TV Development
```bash
npm run start:tv       # Start Expo development server for TV
npm run ios:tv         # Run on Apple TV simulator
npm run android:tv     # Run on Android TV emulator
npm run prebuild:tv    # Clean prebuild for TV platforms
```

## Building for TV

### Local Development
1. Set the environment variable: `export EXPO_TV=1`
2. Run prebuild: `npm run prebuild:tv`
3. Start development: `npm run start:tv`
4. Run on TV simulator: `npm run ios:tv` or `npm run android:tv`

### EAS Build
Use the TV-specific build profiles:

```bash
# Development builds for TV
eas build --profile development_tv --platform ios
eas build --profile development_tv --platform android

# Production builds for TV
eas build --profile production_tv --platform ios
eas build --profile production_tv --platform android
```

## TV-Specific Considerations

### Navigation
- The app uses React Navigation which works well with TV focus management
- TV remote navigation is handled automatically
- Consider adding `hasTVPreferredFocus` prop to important UI elements

### UI/UX Adaptations
- Bottom tab navigation works on TV but consider if it's optimal for TV UX
- Video player controls should work well with TV remotes
- Consider larger touch targets for TV interaction

### Unsupported Features on TV
- `expo-dev-client` - Development client not supported
- `expo-router` - File-based routing not supported on TV
- Some Expo modules may not work on TV platforms

### Focus Management
For better TV experience, you may want to add focus management:

```jsx
import { Platform } from 'react-native';

// Add TV-specific focus handling
const isTV = Platform.isTV;

<TouchableOpacity
  hasTVPreferredFocus={isTV}
  tvParallaxProperties={{
    enabled: true,
    shiftDistanceX: 2.0,
    shiftDistanceY: 2.0,
  }}
>
  {/* Your content */}
</TouchableOpacity>
```

## Testing

### Apple TV
- Use Apple TV simulator in Xcode
- For physical device: Long press play/pause button for dev menu
- Don't shake the Apple TV device (it won't work!)

### Android TV
- Use Android TV emulator in Android Studio
- Dev menu behavior same as Android phone
- Expo dev menu is not supported on TV

## Troubleshooting

### Common Issues
1. **Build errors**: Make sure you've run `npm run prebuild:tv` with `EXPO_TV=1`
2. **Navigation issues**: TV navigation uses focus-based system, not touch
3. **Missing dependencies**: Some mobile-specific packages may not work on TV

### Environment Variables
Always set `EXPO_TV=1` when developing for TV:
```bash
export EXPO_TV=1
# Then run your commands
npm run start
```

## Resources

- [React Native TV Documentation](https://github.com/react-native-tvos/react-native-tvos)
- [Expo TV Guide](https://docs.expo.dev/guides/building-for-tv/)
- [TV Config Plugin](https://www.npmjs.com/package/@react-native-tvos/config-tv)