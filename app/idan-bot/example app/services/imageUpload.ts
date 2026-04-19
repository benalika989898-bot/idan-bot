import { supabase } from '@/lib/supabase';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';

export interface ImageUploadResult {
  url: string;
  path: string;
}

type MediaUploadBucket = 'hero-images' | 'story-images' | 'avatars' | 'products';

/**
 * Pick an image from gallery or camera
 */
export async function pickImage(options?: {
  allowsEditing?: boolean;
  aspect?: [number, number];
  quality?: number;
}): Promise<ImagePicker.ImagePickerResult> {
  // Request permission
  const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permissionResult.granted) {
    throw new Error('Permission to access camera roll is required!');
  }

  // Pick image
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: options?.allowsEditing ?? false,
    aspect: options?.aspect ?? [16, 9],
    quality: options?.quality ?? 0.8,
    base64: true,
  });

  return result;
}

export async function pickStoryMedia(): Promise<ImagePicker.ImagePickerResult> {
  const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permissionResult.granted) {
    throw new Error('Permission to access camera roll is required!');
  }

  return ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images', 'videos'],
    allowsEditing: false,
    allowsMultipleSelection: true,
    orderedSelection: true,
    selectionLimit: 0,
    quality: 0.7,
    base64: true,
    videoExportPreset: ImagePicker.VideoExportPreset.H264_1920x1080,
  });
}

/**
 * Take a photo with camera
 */
export async function takePhoto(options?: {
  allowsEditing?: boolean;
  aspect?: [number, number];
  quality?: number;
}): Promise<ImagePicker.ImagePickerResult> {
  // Request permission
  const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
  if (!permissionResult.granted) {
    throw new Error('Permission to access camera is required!');
  }

  // Take photo
  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: options?.allowsEditing ?? true,
    aspect: options?.aspect ?? [16, 9],
    quality: options?.quality ?? 0.8,
    base64: true,
  });

  return result;
}

/**
 * Upload image to Supabase storage
 */
export async function uploadImage(
  bucket: MediaUploadBucket,
  file: {
    base64: string;
    uri: string;
    type?: string;
  },
  fileName?: string
): Promise<ImageUploadResult> {
  try {
    console.log('🔵 [ImageUpload] Uploading image to bucket:', bucket);

    // Generate file name if not provided
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(7);
    const defaultFileName = `${timestamp}_${randomId}.jpg`;
    const finalFileName = fileName || defaultFileName;

    // Convert base64 to array buffer
    const arrayBuffer = decode(file.base64);

    // Upload to Supabase storage with cache headers to reduce egress
    const { data, error } = await supabase.storage.from(bucket).upload(finalFileName, arrayBuffer, {
      contentType: 'image/jpeg',
      upsert: false,
      cacheControl: '31536000',
    });

    if (error) {
      console.error('🔴 [ImageUpload] Upload error:', error);
      throw error;
    }

    if (!data) {
      throw new Error('No data returned from upload');
    }

    // Get public URL
    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(data.path);

    console.log('🟢 [ImageUpload] Image uploaded successfully:', urlData.publicUrl);

    return {
      url: urlData.publicUrl,
      path: data.path,
    };
  } catch (error) {
    console.error('🔴 [ImageUpload] Unexpected error:', error);
    throw error;
  }
}

/**
 * Delete image from Supabase storage
 */
async function uploadMedia(
  bucket: MediaUploadBucket,
  file: {
    base64?: string | null;
    uri: string;
    mimeType?: string | null;
    type?: string | null;
  },
  fileName?: string
): Promise<ImageUploadResult> {
  try {
    console.log('🔵 [ImageUpload] Uploading media to bucket:', bucket);

    const isVideo = file.type === 'video' || file.mimeType?.startsWith('video/');
    const contentType = file.mimeType || (isVideo ? 'video/mp4' : 'image/jpeg');
    const extension = contentType.split('/')[1]?.replace('quicktime', 'mov') || (isVideo ? 'mp4' : 'jpg');
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(7);
    const finalFileName = fileName || `${timestamp}_${randomId}.${extension}`;

    const arrayBuffer = file.base64
      ? decode(file.base64)
      : await fetch(file.uri).then((response) => response.arrayBuffer());

    const { data, error } = await supabase.storage.from(bucket).upload(finalFileName, arrayBuffer, {
      contentType,
      upsert: false,
      cacheControl: '31536000',
    });

    if (error) {
      console.error('🔴 [ImageUpload] Media upload error:', error);
      throw error;
    }

    if (!data) {
      throw new Error('No data returned from upload');
    }

    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(data.path);

    console.log('🟢 [ImageUpload] Media uploaded successfully:', urlData.publicUrl);

    return {
      url: urlData.publicUrl,
      path: data.path,
    };
  } catch (error) {
    console.error('🔴 [ImageUpload] Unexpected media upload error:', error);
    throw error;
  }
}

export async function deleteImage(
  bucket: MediaUploadBucket,
  path: string
): Promise<void> {
  try {
    console.log('🔵 [ImageUpload] Deleting image:', { bucket, path });

    const { error } = await supabase.storage.from(bucket).remove([path]);

    if (error) {
      console.error('🔴 [ImageUpload] Delete error:', error);
      throw error;
    }

    console.log('🟢 [ImageUpload] Image deleted successfully');
  } catch (error) {
    console.error('🔴 [ImageUpload] Unexpected delete error:', error);
    throw error;
  }
}

/**
 * Upload hero image and update settings
 */
export async function uploadHeroImage(): Promise<string> {
  try {
    // Pick image
    const result = await pickImage({
      aspect: [16, 9],
      quality: 0.9,
    });

    if (result.canceled || !result.assets?.[0]) {
      throw new Error('Image selection was canceled');
    }

    const asset = result.assets[0];
    if (!asset.base64) {
      throw new Error('Failed to get image data');
    }

    // Upload to hero-images bucket
    const uploadResult = await uploadImage('hero-images', {
      base64: asset.base64,
      uri: asset.uri,
      type: asset.type,
    });

    return uploadResult.url;
  } catch (error) {
    console.error('🔴 [ImageUpload] Hero image upload error:', error);
    throw error;
  }
}

export async function uploadAboutImage(): Promise<string> {
  try {
    const result = await pickImage({
      aspect: [16, 9],
      quality: 0.9,
    });

    if (result.canceled || !result.assets?.[0]) {
      throw new Error('Image selection was canceled');
    }

    const asset = result.assets[0];
    if (!asset.base64) {
      throw new Error('Failed to get image data');
    }

    const uploadResult = await uploadImage('hero-images', {
      base64: asset.base64,
      uri: asset.uri,
      type: asset.type,
    });

    return uploadResult.url;
  } catch (error) {
    console.error('🔴 [ImageUpload] About image upload error:', error);
    throw error;
  }
}

/**
 * Upload story image
 */
export async function uploadStoryImage(): Promise<string> {
  try {
    // Pick image
    const result = await pickImage({
      aspect: [9, 16], // Vertical aspect for stories
      quality: 0.8,
    });

    if (result.canceled || !result.assets?.[0]) {
      throw new Error('Image selection was canceled');
    }

    const asset = result.assets[0];
    if (!asset.base64) {
      throw new Error('Failed to get image data');
    }

    // Upload to story-images bucket
    const uploadResult = await uploadImage('story-images', {
      base64: asset.base64,
      uri: asset.uri,
      type: asset.type,
    });

    return uploadResult.url;
  } catch (error) {
    console.error('🔴 [ImageUpload] Story image upload error:', error);
    throw error;
  }
}

/**
 * Upload story image or video
 */
export async function uploadStoryMedia(): Promise<string[]> {
  try {
    const result = await pickStoryMedia();

    if (result.canceled || !result.assets?.[0]) {
      throw new Error('Media selection was canceled');
    }

    const uploadResults = await Promise.all(
      result.assets.map((asset) =>
        uploadMedia('story-images', {
          base64: asset.base64,
          uri: asset.uri,
          mimeType: asset.mimeType,
          type: asset.type,
        })
      )
    );

    return uploadResults.map((uploadResult) => uploadResult.url);
  } catch (error) {
    console.error('🔴 [ImageUpload] Story media upload error:', error);
    throw error;
  }
}

/**
 * Upload avatar image
 */
export async function uploadAvatarImage(): Promise<string> {
  try {
    // Pick image
    const result = await pickImage({
      allowsEditing: true,
      aspect: [1, 1], // Square aspect for avatars
      quality: 0.9,
    });

    if (result.canceled || !result.assets?.[0]) {
      throw new Error('Image selection was canceled');
    }

    const asset = result.assets[0];
    if (!asset.base64) {
      throw new Error('Failed to get image data');
    }

    // Upload to avatars bucket
    const uploadResult = await uploadImage('avatars', {
      base64: asset.base64,
      uri: asset.uri,
      type: asset.type,
    });

    return uploadResult.url;
  } catch (error) {
    console.error('🔴 [ImageUpload] Avatar image upload error:', error);
    throw error;
  }
}

/**
 * Show image picker action sheet
 */
export async function showImagePickerActionSheet(): Promise<ImagePicker.ImagePickerResult | null> {
  return new Promise((resolve) => {
    // For now, just use gallery picker
    // In a real app, you might want to use ActionSheetIOS or a custom modal
    pickImage()
      .then(resolve)
      .catch(() => resolve(null));
  });
}
