import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/plus-jakarta-sans';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';

const queryClient = new QueryClient();

import CustomLoader from '@/components/CustomLoader';
import { useColorScheme } from '@/components/useColorScheme';
import { AlertProvider } from '@/context/AlertContext';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { CallProvider } from '@/context/CallContext';
import { HapticsProvider } from '@/context/HapticsContext';
import { ThemeProvider as AppThemeProvider } from '@/context/ThemeContext';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary
} from 'expo-router';

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: '(auth)/login',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
    ...FontAwesome.font,
  });

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <AppThemeProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <CallProvider>
            <HapticsProvider>
              <AlertProvider>
                <RootLayoutNav />
              </AlertProvider>
            </HapticsProvider>
          </CallProvider>
        </AuthProvider>
      </QueryClientProvider>
    </AppThemeProvider>
  );
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const { user, isLoading, hasSeenOnboarding } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!user) {
      if (!inAuthGroup) {
        // Redirect to auth flow if accessing protected route
        if (hasSeenOnboarding) {
          router.replace('/(auth)/login');
        } else {
          router.replace('/(auth)/onboarding');
        }
      } else if (segments[1] === 'onboarding' && hasSeenOnboarding) {
        // Prevent seeing onboarding again if already seen
        router.replace('/(auth)/login');
      }
    } else if (inAuthGroup) {
      // Redirect to home if accessing auth route while logged in
      router.replace('/(tabs)');
    }
  }, [user, segments, isLoading, hasSeenOnboarding]);

  if (isLoading) {
    return <CustomLoader message="Starting up..." />;
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
      </Stack>
    </ThemeProvider>
  );
}
