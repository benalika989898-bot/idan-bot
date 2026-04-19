import type { ErrorBoundaryProps } from 'expo-router';
import { router } from 'expo-router';
import { SafeAreaView, Text, Pressable, View } from 'react-native';

export default function CrewErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
      <View style={{ alignItems: 'center', gap: 16 }}>
        <Text style={{ fontSize: 20, fontWeight: '700', color: '#1e293b', textAlign: 'center' }}>
          שגיאה בטעינת הדף
        </Text>
        <Text style={{ fontSize: 14, color: '#64748b', textAlign: 'center', lineHeight: 22 }}>
          {error.message}
        </Text>
        <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
          <Pressable
            onPress={retry}
            style={({ pressed }) => ({
              backgroundColor: pressed ? '#1e293b' : '#0f172a',
              paddingHorizontal: 24,
              paddingVertical: 12,
              borderRadius: 10,
            })}>
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>נסה שוב</Text>
          </Pressable>
          <Pressable
            onPress={() => router.replace('/')}
            style={({ pressed }) => ({
              backgroundColor: pressed ? '#e2e8f0' : '#f1f5f9',
              paddingHorizontal: 24,
              paddingVertical: 12,
              borderRadius: 10,
            })}>
            <Text style={{ color: '#0f172a', fontSize: 16, fontWeight: '600' }}>חזרה לדף הבית</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}
