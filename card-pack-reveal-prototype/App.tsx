import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PackRevealScreen } from './src/reveal/PackRevealScreen';

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <PackRevealScreen />
    </SafeAreaProvider>
  );
}
