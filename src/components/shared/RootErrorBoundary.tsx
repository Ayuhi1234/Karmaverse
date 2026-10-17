import React from 'react';
import { View, Text, ScrollView, Platform } from 'react-native';

// Catches any render/lifecycle error in the app tree and shows the actual message
// and stack on screen, instead of the OS "keeps stopping" crash. This both makes a
// release crash diagnosable (screenshot the text) and keeps the app from dying
// silently. Uses only plain RN primitives so it works even if providers/theme fail.
interface State {
  error: Error | null;
  info: string | null;
}

export class RootErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { error: null, info: null };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack?: string }) {
    this.setState({ info: info?.componentStack || null });
    // eslint-disable-next-line no-console
    console.error('[RootErrorBoundary]', error, info?.componentStack);
  }

  render() {
    const { error, info } = this.state;
    if (!error) return this.props.children;

    return (
      <View style={{ flex: 1, backgroundColor: '#0a130d', paddingTop: Platform.OS === 'ios' ? 60 : 40 }}>
        <ScrollView contentContainerStyle={{ padding: 20 }}>
          <Text style={{ color: '#f87171', fontSize: 20, fontWeight: '900', marginBottom: 12 }}>
            App error (please screenshot)
          </Text>
          <Text style={{ color: '#e6ede8', fontSize: 14, fontWeight: '700', marginBottom: 6 }}>
            {error.name}: {error.message}
          </Text>
          {!!(error as any).stack && (
            <Text style={{ color: '#9fb3a6', fontSize: 11, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', marginTop: 12 }}>
              {String((error as any).stack).slice(0, 2000)}
            </Text>
          )}
          {!!info && (
            <Text style={{ color: '#6f8377', fontSize: 11, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', marginTop: 12 }}>
              {info.slice(0, 1500)}
            </Text>
          )}
        </ScrollView>
      </View>
    );
  }
}
