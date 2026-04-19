import { View, Text, Pressable, Animated } from 'react-native';
import React from 'react';
import { BlurView } from 'expo-blur';
import { router } from 'expo-router';
import { useFab } from '@/contexts/FabContext';
import { Ionicons } from '@expo/vector-icons';

const ActionsScreen = () => {
  const { setIsModalOpen } = useFab();

  const animations = React.useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;

  const actions = [
    {
      bg: 'bg-[#c6ff7e]',
      title: 'קביעת\nתור ללקוח',
      description: 'בחר לקוח שקיים או שלא וקבעי לו תור בשעה שתרצי',
    },
    {
      bg: 'bg-[#c09ff8]',
      title: 'שליחת\nהודעה ללקוחות',
      description: 'התראה שתשלח לכל המשתמשים שרשומים לאפליקציה',
    },
    {
      bg: 'bg-[#ffc5dd]',
      title: 'עריכת\nשעות פעילות',
      description: 'עריכת ימים ושעות, לסגור ימים לערוך שעות שבהן תעבדי וכו...',
    },
  ];

  React.useEffect(() => {
    setIsModalOpen(true);

    animations.forEach((anim, index) => {
      setTimeout(() => {
        Animated.spring(anim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 100,
          friction: 8,
        }).start();
      }, index * 150);
    });

    return () => {
      setIsModalOpen(false);
    };
  }, [setIsModalOpen, animations]);

  return (
    <BlurView intensity={30} tint="dark" className="absolute inset-0 z-50 flex-1">
      <View style={{ flex: 1 }}>
        <View className="flex-1 justify-between px-4 pb-14 pt-10">
          <View className="gap-4">
            {actions.map((action, index) => (
              <Animated.View
                key={index}
                style={{
                  opacity: animations[index],
                  transform: [
                    {
                      translateY: animations[index].interpolate({
                        inputRange: [0, 1],
                        outputRange: [50, 0],
                      }),
                    },
                  ],
                }}>
                <Pressable
                  onPress={() => {
                    if (index === 0) {
                      router.push('/(modal)/actions/book-appointment');
                    } else if (index === 1) {
                      router.push('/(modal)/actions/send-message');
                    } else if (index === 2) {
                      router.push('/(modal)/actions/edit-schedule');
                    }
                  }}
                  style={{ direction: 'rtl' }}
                  className={`h-40 w-full flex-row items-center justify-between rounded-2xl ${action.bg} p-4 transition-transform duration-100 active:scale-95`}>
                  <View className="flex-1 gap-1">
                    <Text className=" text-left text-3xl font-bold text-black">{action.title}</Text>
                    <Text className="text-left text-sm text-black/70">{action.description}</Text>
                  </View>
                  <View className="h-12 w-12 items-center justify-center rounded-full bg-black/50 p-2">
                    <Ionicons name="add" size={24} color="white" />
                  </View>
                </Pressable>
              </Animated.View>
            ))}
          </View>
        </View>
      </View>
    </BlurView>
  );
};

export default ActionsScreen;
