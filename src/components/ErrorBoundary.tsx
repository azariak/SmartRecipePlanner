import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts } from '../theme';

type Props = { children: React.ReactNode };
type State = { error: Error | null };

/**
 * Catches render/runtime errors anywhere below it and shows a recoverable
 * fallback instead of a blank screen. "Try again" clears the error and
 * re-renders the tree.
 */
export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    // Surface it in the dev console; a real app would report to a service here.
    console.error('Uncaught UI error:', error);
  }

  reset = () => this.setState({ error: null });

  render() {
    if (this.state.error) {
      return (
        <View style={styles.wrap}>
          <Text style={styles.mono}>● SOMETHING BROKE</Text>
          <Text style={styles.title}>That wasn’t supposed to happen.</Text>
          <Text style={styles.msg} numberOfLines={4}>
            {this.state.error.message}
          </Text>
          <Pressable
            onPress={this.reset}
            style={({ pressed }) => [styles.btn, pressed && { backgroundColor: colors.yellowBright }]}
          >
            <Text style={styles.btnText}>Try again</Text>
          </Pressable>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: 28, gap: 12 },
  mono: { color: colors.yellow, fontFamily: fonts.mono, fontSize: 11, letterSpacing: 1.6 },
  title: { color: colors.ink, fontFamily: fonts.sans, fontSize: 22, fontWeight: '700', textAlign: 'center', letterSpacing: -0.5 },
  msg: { color: colors.muted2, fontFamily: fonts.mono, fontSize: 11, letterSpacing: 0.5, textAlign: 'center', lineHeight: 18 },
  btn: { marginTop: 8, height: 52, paddingHorizontal: 28, backgroundColor: colors.yellow, alignItems: 'center', justifyContent: 'center' },
  btnText: { color: colors.bg, fontFamily: fonts.sans, fontSize: 15, fontWeight: '700' },
});
