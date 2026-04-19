import React, { useEffect, useState } from 'react';
import { View, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { isStoryVideoUrl, generateVideoThumbnail } from '@/utils/storyMedia';

interface StoryImageProps {
  mediaUrl: string;
  onRemove: () => void;
}

export const StoryImage: React.FC<StoryImageProps> = ({ mediaUrl, onRemove }) => {
  const isVideo = isStoryVideoUrl(mediaUrl);
  const [displayUrl, setDisplayUrl] = useState<string | null>(isVideo ? null : mediaUrl);

  useEffect(() => {
    if (isVideo) {
      generateVideoThumbnail(mediaUrl).then((uri) => setDisplayUrl(uri ?? mediaUrl));
    }
  }, [isVideo, mediaUrl]);

  return (
    <View className="relative mb-3 mr-3">
      <View className="h-20 w-20 overflow-hidden rounded-xl bg-gray-100 shadow-sm">
        {displayUrl && (
          <Image
            source={{ uri: displayUrl }}
            style={{ width: '100%', height: '100%' }}
            contentFit="cover"
            cachePolicy="disk"
            transition={1000}
          />
        )}
      </View>
      {isVideo && (
        <View className="absolute bottom-1 left-1 h-5 w-5 items-center justify-center rounded-full bg-black/70">
          <Ionicons name="play" size={10} color="white" />
        </View>
      )}
      <Pressable
        onPress={onRemove}
        className="absolute -right-1 -top-1 h-6 w-6 items-center justify-center rounded-full bg-black shadow-sm"
        style={({ pressed }) => ({
          backgroundColor: pressed ? '#1f1f1f' : '#000',
        })}>
        <Ionicons name="close" size={10} color="white" />
      </Pressable>
    </View>
  );
};
