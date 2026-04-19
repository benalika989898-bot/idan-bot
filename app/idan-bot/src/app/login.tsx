import React from 'react';
import { StyleSheet, View } from 'react-native';

import PhoneLogin from '@/components/PhoneLogin';
import { ThemedView } from '@/components/themed-view';

export default function LoginScreen() {
  return (
    <ThemedView style={styles.container}>
      <View style={styles.inner}>
        <PhoneLogin />
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  inner: {
    flex: 1,
  },
});
