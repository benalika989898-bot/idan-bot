import { fetchAllProfiles } from '@/services/crew/profiles';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { FlashList } from '@shopify/flash-list';
import { useQuery } from '@tanstack/react-query';
import * as Contacts from 'expo-contacts';
import { Stack, router } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { toast } from 'sonner-native';
import { usePickedContact } from './pickedContactStore';

export default function PickContactScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [contacts, setContacts] = useState<Contacts.Contact[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const setPickedContacts = usePickedContact((s) => s.set);

  useEffect(() => {
    (async () => {
      const { status } = await Contacts.requestPermissionsAsync();
      if (status !== 'granted') {
        toast.error('לא ניתנה הרשאת גישה לאנשי קשר');
        router.back();
        return;
      }

      const { data } = await Contacts.getContactsAsync({
        fields: [Contacts.Fields.Name, Contacts.Fields.PhoneNumbers],
      });

      const withPhone = data.filter((c) => c.phoneNumbers && c.phoneNumbers.length > 0);
      setContacts(withPhone);
      setLoading(false);
    })();
  }, []);

  const handleConfirm = useCallback(() => {
    const picked = contacts
      .filter((c) => selectedIds.has(c.id!))
      .map((c) => ({
        name: c.name ?? '',
        phone: c.phoneNumbers?.[0]?.number ?? '',
      }));
    setPickedContacts(picked);
    router.back();
  }, [contacts, selectedIds, setPickedContacts]);

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable onPress={handleConfirm} disabled={selectedIds.size === 0}>
          <Text
            className={`text-base font-semibold ${selectedIds.size === 0 ? 'text-gray-400' : 'text-black'}`}>
            {selectedIds.size > 0 ? `הוסף (${selectedIds.size})` : 'הוסף'}
          </Text>
        </Pressable>
      ),
    });
  }, [selectedIds.size, handleConfirm]);

  const filteredContacts = useMemo(() => {
    if (!search.trim()) return contacts;
    const query = search.trim().toLowerCase();
    return contacts.filter((c) => c.name?.toLowerCase().includes(query));
  }, [contacts, search]);

  const toggleContact = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator size="large" color="#000000" />
        <Text className="mt-4 text-gray-500" style={{ direction: 'rtl' }}>
          טוען אנשי קשר...
        </Text>
      </View>
    );
  }

  return (
    <>
      <Stack.SearchBar
        placeholder="חיפוש לפי שם..."
        onChangeText={(e) => setSearch(e.nativeEvent.text)}
        hideWhenScrolling={true}
      />

      {filteredContacts.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8 py-20">
          <Ionicons name="people-outline" size={64} color="#D1D5DB" style={{ marginBottom: 16 }} />
          <Text
            className="mb-2 text-center text-lg font-medium text-gray-900"
            style={{ direction: 'rtl' }}>
            {search ? 'לא נמצאו אנשי קשר' : 'אין אנשי קשר עם מספר טלפון'}
          </Text>
          <Text className="text-center text-sm text-gray-500" style={{ direction: 'rtl' }}>
            {search ? 'נסה לחפש במילות חיפוש אחרות' : ''}
          </Text>
        </View>
      ) : (
        <FlashList
          data={filteredContacts}
          estimatedItemSize={56}
          contentInsetAdjustmentBehavior="automatic"
          showsVerticalScrollIndicator={false}
          contentContainerClassName="pt-4"
          contentContainerStyle={{ paddingBottom: insets.bottom, direction: 'rtl' }}
          keyExtractor={(item) => item.id ?? item.name ?? ''}
          keyboardShouldPersistTaps="handled"
          extraData={selectedIds}
          renderItem={({ item }) => {
            const phoneNumber = item.phoneNumbers?.[0]?.number ?? '';
            const isSelected = selectedIds.has(item.id!);
            return (
              <Pressable
                onPress={() => toggleContact(item.id!)}
                className="mx-4 mb-3 rounded-lg bg-white p-4"
                style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}>
                <View className="flex-row items-center justify-between">
                  <View className="flex-1 flex-row items-center gap-3">
                    <View
                      className={`h-12 w-12 items-center justify-center rounded-full ${isSelected ? 'bg-black' : 'bg-gray-200'}`}>
                      {isSelected ? (
                        <Ionicons name="checkmark" size={22} color="#fff" />
                      ) : (
                        <Ionicons name="person" size={20} color="#6b7280" />
                      )}
                    </View>
                    <Text className="text-left text-lg font-semibold text-gray-900">
                      {item.name}
                    </Text>
                  </View>
                  <Text className="text-sm text-gray-500" style={{ direction: 'ltr' }}>
                    {phoneNumber}
                  </Text>
                </View>
              </Pressable>
            );
          }}
        />
      )}
    </>
  );
}
