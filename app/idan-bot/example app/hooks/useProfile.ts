import { useState } from 'react';
import { Alert } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { uploadAvatarImage } from '@/services/imageUpload';
import { supabase } from '@/lib/supabase';

interface ProfileData {
  full_name?: string;
  avatar_url?: string;
  role?: 'customer' | 'crew' | 'admin';
  is_blocked?: boolean | null;
  display_order?: number | null;
}

interface UseProfileOptions {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
  showSuccessMessage?: boolean;
  profileId?: string;
}

interface UseProfileReturn {
  isUploading: boolean;
  isUpdating: boolean;
  uploadProfileImage: () => Promise<void>;
  updateProfile: (data: ProfileData) => Promise<void>;
  updateFullProfile: (fullName: string, imageUrl?: string) => Promise<void>;
}

export function useProfile(options: UseProfileOptions = {}): UseProfileReturn {
  const { user, refreshUser } = useAuth();
  const queryClient = useQueryClient();
  const [isUploading, setIsUploading] = useState(false);
  const targetProfileId = options.profileId || user?.id;

  const updateProfileMutation = useMutation({
    mutationFn: async (profileData: ProfileData) => {
      if (!targetProfileId) {
        throw new Error('Missing profile id');
      }
      const { data, error } = await supabase
        .from('profiles')
        .update(profileData)
        .eq('id', targetProfileId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      if (targetProfileId === user?.id) {
        refreshUser();
      }
      queryClient.invalidateQueries({ queryKey: ['user'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      
      if (options.showSuccessMessage) {
        Alert.alert('Success', 'Profile updated successfully!');
      }
      
      if (options.onSuccess) {
        options.onSuccess();
      }
    },
    onError: (error) => {
      console.error('Error updating profile:', error);
      if (options.onError) {
        options.onError(error as Error);
      } else {
        Alert.alert('Error', 'Failed to update profile. Please try again.');
      }
    },
  });

  const uploadProfileImage = async (): Promise<void> => {
    try {
      setIsUploading(true);
      const imageUrl = await uploadAvatarImage();
      await updateProfileMutation.mutateAsync({ avatar_url: imageUrl });
    } catch (error: any) {
      if (error.message === 'Image selection was canceled') {
        // User canceled, don't show error
        return;
      }
      
      console.error('Error uploading image:', error);
      if (options.onError) {
        options.onError(error);
      } else {
        Alert.alert('Error', 'Failed to upload image. Please try again.');
      }
    } finally {
      setIsUploading(false);
    }
  };

  const updateProfile = async (profileData: ProfileData): Promise<void> => {
    await updateProfileMutation.mutateAsync(profileData);
  };

  const updateFullProfile = async (fullName: string, imageUrl?: string): Promise<void> => {
    const updateData: ProfileData = { full_name: fullName };
    if (imageUrl) {
      updateData.avatar_url = imageUrl;
    }
    await updateProfileMutation.mutateAsync(updateData);
  };

  return {
    isUploading,
    isUpdating: updateProfileMutation.isPending,
    uploadProfileImage,
    updateProfile,
    updateFullProfile,
  };
}
