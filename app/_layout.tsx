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
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';

const queryClient = new QueryClient();

import CustomLoader from '@/components/CustomLoader';
import RestrictedTabModal from '@/components/RestrictedTabModal';
import { useColorScheme } from '@/components/useColorScheme';
import { AlertProvider } from '@/context/AlertContext';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { CallProvider } from '@/context/CallContext';
import { HapticsProvider } from '@/context/HapticsContext';
import { RestrictionProvider } from '@/context/RestrictionContext';
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

  // Move SplashScreen.hideAsync() to RootLayoutNav to wait for Auth state

  if (!loaded) {
    return null;
  }

  return (
    <AppThemeProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <RestrictionProvider>
            <CallProvider>
              <HapticsProvider>
                <AlertProvider>
                  <RootLayoutNav fontsLoaded={loaded} />
                  <RestrictedTabModal />
                </AlertProvider>
              </HapticsProvider>
            </CallProvider>
          </RestrictionProvider>
        </AuthProvider>
      </QueryClientProvider>
    </AppThemeProvider>
  );
}

function RootLayoutNav({ fontsLoaded }: { fontsLoaded: boolean }) {
  const colorScheme = useColorScheme();
  const { user, isLoading, hasSeenOnboarding } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (fontsLoaded && !isLoading) {
      // Small delay to ensure the initial screen has rendered
      const timer = setTimeout(() => {
        SplashScreen.hideAsync().catch(() => { /* Ignore errors if already hidden */ });
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [fontsLoaded, isLoading]);

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
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <StatusBar style="auto" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="modal" options={{ presentation: 'modal', headerShown: true }} />
          <Stack.Screen name="manage-listings" />
          <Stack.Screen name="settings/support_chat" />
        </Stack>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
