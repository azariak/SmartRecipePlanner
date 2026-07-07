import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DefaultTheme, type Theme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { colors } from './src/theme';
import type { RootStackParamList } from './src/types';
import { RecipeProvider } from './src/state/RecipeStore';
import { SavedRecipesProvider } from './src/state/SavedRecipesStore';
import CaptureScreen from './src/screens/CaptureScreen';
import RecipeListScreen from './src/screens/RecipeListScreen';
import RecipeDetailScreen from './src/screens/RecipeDetailScreen';
import SavedRecipesScreen from './src/screens/SavedRecipesScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

const navTheme: Theme = {
  ...DefaultTheme,
  dark: true,
  colors: {
    ...DefaultTheme.colors,
    background: colors.bg,
    card: colors.bg,
    text: colors.ink,
    border: colors.border,
    primary: colors.yellow,
  },
};

export default function App() {
  return (
    <SafeAreaProvider>
      <SavedRecipesProvider>
        <RecipeProvider>
          <NavigationContainer theme={navTheme}>
            <StatusBar style="light" />
            <Stack.Navigator
              initialRouteName="Capture"
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: colors.bg },
                animation: 'slide_from_right',
              }}
            >
              <Stack.Screen name="Capture" component={CaptureScreen} />
              <Stack.Screen name="RecipeList" component={RecipeListScreen} />
              <Stack.Screen name="RecipeDetail" component={RecipeDetailScreen} />
              <Stack.Screen name="Saved" component={SavedRecipesScreen} />
            </Stack.Navigator>
          </NavigationContainer>
        </RecipeProvider>
      </SavedRecipesProvider>
    </SafeAreaProvider>
  );
}
