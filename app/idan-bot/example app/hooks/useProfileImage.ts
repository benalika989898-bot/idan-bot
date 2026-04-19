import { useState } from 'react';
import { Alert } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { uploadAvatarImage } from '@/services/imageUpload';
import { supabase } from '@/lib/supabase';

interface UseProfileImageOptions {
  onSuccess?: (imageUrl: string) => void;
  onError?: (error: Error) => void;
  showToast?: boolean;
}

interface UseProfileImageReturn {
  isUploading: boolean;
  uploadImage: () => Promise<void>;
  updateProfileImage: (imageUrl: string) => Promise<void>;
}

export function useProfileImage(options: UseProfileImageOptions = {}): UseProfileImageReturn {
  const { user, refreshUser } = useAuth();
  const queryClient = useQueryClient();
  const [isUploading, setIsUploading] = useState(false);

  const updateProfileMutation = useMutation({
    mutationFn: async (imageUrl: string) => {
      const { data, error } = await supabase
        .from('profiles')
        .update({ avatar_url: imageUrl })
        .eq('id', user?.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      refreshUser();
      queryClient.invalidateQueries({ queryKey: ['user'] });
      if (options.showToast) {
        // You can import toast here if needed
        // toast.success('Profile image updated successfully!');
      }
    },
    onError: (error) => {
      console.error('Error updating profile image:', error);
      if (options.onError) {
        options.onError(error as Error);
      } else {
        Alert.alert('Error', 'Failed to update profile image. Please try again.');
      }
    },
  });

  const uploadImage = async (): Promise<void> => {
    try {
      setIsUploading(true);
      const imageUrl = await uploadAvatarImage();
      await updateProfileMutation.mutateAsync(imageUrl);
      
      if (options.onSuccess) {
        options.onSuccess(imageUrl);
      }
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

  const updateProfileImage = async (imageUrl: string): Promise<void> => {
    await updateProfileMutation.mutateAsync(imageUrl);
  };

  return {
    isUploading: isUploading || updateProfileMutation.isPending,
    uploadImage,
    updateProfileImage,
  };
}