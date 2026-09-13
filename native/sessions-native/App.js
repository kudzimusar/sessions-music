import React, {useEffect, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';

const DEFAULT_UAT_ORIGIN = 'https://sessions-music.kudzimusar.chatgpt.site';
const UAT_ORIGIN = process.env.EXPO_PUBLIC_SESSIONS_API_BASE_URL || DEFAULT_UAT_ORIGIN;

function Fact({label, value}) {
  return (
    <View style={styles.factRow}>
      <Text style={styles.factLabel}>{label}</Text>
      <Text selectable style={styles.factValue}>{value}</Text>
    </View>
  );
}

export default function App() {
  const [state, setState] = useState({status: 'idle', release: null, error: null});
  const platformLabel = useMemo(
    () => `${Platform.OS} ${String(Platform.Version)}`,
    [],
  );

  async function verifyRelease() {
    setState({status: 'loading', release: null, error: null});
    try {
      const response = await fetch(`${UAT_ORIGIN}/api/release`, {
        method: 'GET',
        headers: {Accept: 'application/json'},
      });
      if (!response.ok) {
        throw new Error(`Release endpoint returned HTTP ${response.status}`);
      }
      const release = await response.json();
      setState({status: 'success', release, error: null});
    } catch (error) {
      setState({status: 'error', release: null, error: String(error)});
    }
  }

  useEffect(() => {
    void verifyRelease();
  }, []);

  const releaseOk =
    state.release?.id === 'unified-platform-v1-phase5' &&
    state.release?.phase === 5 &&
    state.release?.visualRevision === 'phase1-5-native-desktop-v2';

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.brandRow}>
          <View style={styles.mark}><Text style={styles.markText}>S</Text></View>
          <View>
            <Text style={styles.brand}>Sessions</Text>
            <Text style={styles.kicker}>NATIVE PHASE 1–5 HARNESS</Text>
          </View>
        </View>

        <Text style={styles.title}>Native runtime configuration</Text>
        <Text style={styles.body}>
          This screen is rendered by React Native inside the iOS or Android binary. It is not the hosted PWA and it does not embed the Sessions website in a WebView.
        </Text>

        <View style={styles.panel}>
          <Fact label="Platform" value={platformLabel} />
          <Fact label="UAT origin" value={UAT_ORIGIN} />
          <Fact label="Target phase" value="Phase 1–5" />
          <Fact label="Expected revision" value="phase1-5-native-desktop-v2" />
        </View>

        <View style={[styles.statusPanel, releaseOk ? styles.statusOk : styles.statusNeutral]}>
          {state.status === 'loading' ? (
            <ActivityIndicator />
          ) : (
            <>
              <Text style={styles.statusTitle}>
                {releaseOk ? 'Version 19 backend contract detected' : 'Backend contract not yet verified'}
              </Text>
              <Text style={styles.statusBody}>
                {state.error ||
                  (state.release
                    ? JSON.stringify(state.release, null, 2)
                    : 'Waiting for release verification.')}
              </Text>
            </>
          )}
        </View>

        <Pressable style={styles.button} onPress={verifyRelease} accessibilityRole="button">
          <Text style={styles.buttonText}>Verify Phase 5 backend</Text>
        </Pressable>

        <View style={styles.notice}>
          <Text style={styles.noticeTitle}>Authentication boundary</Text>
          <Text style={styles.body}>
            Version 19 uses the private ChatGPT Sites audience gate for hosted UAT. That is not a production native authentication mechanism. Full signed-in native Phase 4.5/5 integration will remain blocked until the real Sessions Supabase identity environment is positively identified and configured. No bypass will be added for simulator testing.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {flex: 1, backgroundColor: '#FFFFFF'},
  content: {paddingHorizontal: 20, paddingTop: 22, paddingBottom: 40},
  brandRow: {flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 34},
  mark: {width: 44, height: 44, borderRadius: 13, backgroundColor: '#4169E1', alignItems: 'center', justifyContent: 'center'},
  markText: {color: '#FFFFFF', fontWeight: '900', fontSize: 22},
  brand: {color: '#000000', fontWeight: '900', fontSize: 20, letterSpacing: -0.5},
  kicker: {color: '#6B7280', marginTop: 2, fontSize: 10, fontWeight: '800', letterSpacing: 1.2},
  title: {color: '#000000', fontWeight: '900', fontSize: 32, lineHeight: 36, letterSpacing: -1.1, marginBottom: 12},
  body: {color: '#4B5563', fontSize: 15, lineHeight: 23},
  panel: {marginTop: 24, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 18, overflow: 'hidden'},
  factRow: {padding: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E5E7EB'},
  factLabel: {color: '#6B7280', fontSize: 10, fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 4},
  factValue: {color: '#111827', fontSize: 13, fontWeight: '650'},
  statusPanel: {marginTop: 18, borderRadius: 18, padding: 16, minHeight: 94, justifyContent: 'center'},
  statusOk: {backgroundColor: '#EEF2FF', borderWidth: 1, borderColor: '#C7D2FE'},
  statusNeutral: {backgroundColor: '#F7F7F8', borderWidth: 1, borderColor: '#E5E7EB'},
  statusTitle: {color: '#111827', fontSize: 15, fontWeight: '800', marginBottom: 8},
  statusBody: {color: '#4B5563', fontSize: 12, lineHeight: 18},
  button: {marginTop: 18, minHeight: 52, borderRadius: 16, backgroundColor: '#4169E1', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18},
  buttonText: {color: '#FFFFFF', fontSize: 15, fontWeight: '850'},
  notice: {marginTop: 28, paddingTop: 22, borderTopWidth: 1, borderTopColor: '#E5E7EB'},
  noticeTitle: {color: '#000000', fontSize: 17, fontWeight: '850', marginBottom: 8},
});
