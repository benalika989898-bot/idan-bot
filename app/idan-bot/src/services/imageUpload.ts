import { supabase } from '@/lib/supabase';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';

export interface ImageUploadResult {
  url: string;
  path: string;
}

const BUCKET = 'post-images';

export async function pickImage(): Promise<ImagePicker.ImagePickerResult> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new Error('Permission to access the photo library is required.');
  }

  return ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: [16, 9],
    quality: 0.8,
    base64: true,
  });
}

export async function takePhoto(): Promise<ImagePicker.ImagePickerResult> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) {
    throw new Error('Permission to access the camera is required.');
  }

  return ImagePicker.launchCameraAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: [16, 9],
    quality: 0.8,
    base64: true,
  });
}

export async function uploadImage(file: {
  base64: string;
  uri: string;
}): Promise<ImageUploadResult> {
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substring(7);
  const fileName = `${timestamp}_${randomId}.jpg`;

  const arrayBuffer = decode(file.base64);

  const { data, error } = await supabase.storage.from(BUCKET).upload(fileName, arrayBuffer, {
    contentType: 'image/jpeg',
    upsert: false,
    cacheControl: '31536000',
  });

  if (error) throw error;
  if (!data) throw new Error('No data returned from upload.');

  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(data.path);

  return {
    url: urlData.publicUrl,
    path: data.path,
  };
}

export async function deleteImage(path: string): Promise<void> {
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) throw error;
}

/**
 * Pick an image from the library, upload it to Supabase storage, and return the public URL.
 */
export async function pickAndUploadImage(): Promise<ImageUploadResult> {
  const result = await pickImage();
  if (result.canceled || !result.assets?.[0]) {
    throw new Error('Image selection was canceled.');
  }

  const asset = result.assets[0];
  if (!asset.base64) {
    throw new Error('Failed to read image data.');
  }

  return uploadImage({ base64: asset.base64, uri: asset.uri });
}

/**
 * Take a photo and upload it to Supabase storage, returning the public URL.
 */
export async function takeAndUploadPhoto(): Promise<ImageUploadResult> {
  const result = await takePhoto();
  if (result.canceled || !result.assets?.[0]) {
    throw new Error('Photo capture was canceled.');
  }

  const asset = result.assets[0];
  if (!asset.base64) {
    throw new Error('Failed to read photo data.');
  }

  return uploadImage({ base64: asset.base64, uri: asset.uri });
}
