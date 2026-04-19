import type { ErrorBoundaryProps } from 'expo-router';
import { Pressable, SafeAreaView, Text, View } from 'react-native';

export default function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return (
    <SafeAreaView
      style={{
        flex: 1,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
      }}>
      <View style={{ alignItems: 'center', gap: 16 }}>
        <Text style={{ fontSize: 20, fontWeight: '700', color: '#1e293b', textAlign: 'center' }}>
          משהו השתבש
        </Text>
        <Text style={{ fontSize: 14, color: '#64748b', textAlign: 'center', lineHeight: 22 }}>
          {error.message}
        </Text>
        <Pressable
          onPress={retry}
          style={({ pressed }) => ({
            backgroundColor: pressed ? '#1e293b' : '#0f172a',
            paddingHorizontal: 24,
            paddingVertical: 12,
            borderRadius: 10,
            marginTop: 8,
          })}>
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>נסה שוב</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
