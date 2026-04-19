import { supabase } from '@/lib/supabase';

export interface AppSettings {
  id: string;
  slot_interval_minutes: number;
  hero_image_url?: string;
  about_image_url?: string | null;
  stories_image_urls: string[];
  waze_url?: string;
  whatsapp_url?: string;
  instagram_url?: string;
  facebook_url?: string;
  tiktok_url?: string;
  app_share_url?: string;
  app_site_url?: string;
  business_name?: string;
  business_description?: string;
  about_text?: string | null;
  phone_number?: string;
  email?: string;
  address?: string;
  default_appointment_buffer_minutes: number;
  max_advance_booking_days: number;
  created_at: string;
  updated_at: string;
}

export interface UpdateAppSettingsData {
  slot_interval_minutes?: number;
  hero_image_url?: string;
  about_image_url?: string | null;
  stories_image_urls?: string[];
  waze_url?: string;
  whatsapp_url?: string;
  instagram_url?: string;
  facebook_url?: string;
  tiktok_url?: string;
  app_share_url?: string | null;
  app_site_url?: string | null;
  business_name?: string;
  business_description?: string;
  about_text?: string | null;
  phone_number?: string;
  email?: string;
  address?: string;
  default_appointment_buffer_minutes?: number;
  max_advance_booking_days?: number;
}

/**
 * Get the current app settings
 */
export async function getAppSettings(): Promise<{ data: AppSettings | null; error: any }> {
  try {
    const { data, error } = await supabase
      .from('settings')
      .select('*')
      .limit(1)
      .single();

    if (error) {
      console.error('Error fetching app settings:', error);
      return { data: null, error };
    }

    return { data: data as AppSettings, error: null };
  } catch (error) {
    console.error('Unexpected error fetching settings:', error);
    return { data: null, error };
  }
}

/**
 * Update app settings (admin only)
 */
export async function updateAppSettings(updates: UpdateAppSettingsData): Promise<{ data: AppSettings | null; error: any }> {
  try {
    // Get current user to check permissions
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { data: null, error: new Error('Authentication required') };
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      return { data: null, error: new Error('Admin permission required to update settings') };
    }

    // Get the existing settings first to get the ID
    const { data: existingSettings, error: fetchError } = await getAppSettings();

    if (fetchError || !existingSettings) {
      return { data: null, error: fetchError };
    }

    const { data, error } = await supabase
      .from('settings')
      .update(updates)
      .eq('id', existingSettings.id)
      .select();

    if (error) {
      console.error('Error updating app settings:', error);
      return { data: null, error };
    }

    if (!data || data.length === 0) {
      return { data: null, error: new Error('No settings found to update - check user permissions') };
    }

    const updatedSettings = data[0];

    // Broadcast the settings change to all connected clients
    try {
      await supabase.channel('settings-updates').send({
        type: 'broadcast',
        event: 'settings-changed',
        payload: {
          updatedSettings: updatedSettings,
          changedFields: Object.keys(updates)
        },
      });
    } catch {
      // Don't fail the update if broadcast fails
    }

    return { data: updatedSettings as AppSettings, error: null };
  } catch (error) {
    console.error('Unexpected error updating settings:', error);
    return { data: null, error };
  }
}

/**
 * Get just the slot interval (cached for performance)
 */
export async function getSlotInterval(): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('settings')
      .select('slot_interval_minutes')
      .limit(1)
      .single();

    if (error) {
      return 30; // fallback
    }

    return data.slot_interval_minutes || 30;
  } catch {
    return 30; // fallback
  }
}

/**
 * Get social media URLs
 */
export async function getSocialMediaUrls(): Promise<{
  waze?: string;
  whatsapp?: string;
  instagram?: string;
  facebook?: string;
  tiktok?: string;
  appShare?: string;
  appSite?: string;
}> {
  try {
    const { data, error } = await supabase
      .from('settings')
      .select(
        'waze_url, whatsapp_url, instagram_url, facebook_url, tiktok_url, app_share_url, app_site_url'
      )
      .limit(1)
      .single();

    if (error) {
      return {};
    }

    return {
      waze: data.waze_url,
      whatsapp: data.whatsapp_url,
      instagram: data.instagram_url,
      facebook: data.facebook_url,
      tiktok: data.tiktok_url,
      appShare: data.app_share_url,
      appSite: data.app_site_url,
    };
  } catch {
    return {};
  }
}

/**
 * Get media URLs (hero and stories)
 */
export async function getMediaUrls(): Promise<{
  hero_image_url?: string;
  stories_image_urls: string[];
}> {
  try {
    const { data, error } = await supabase
      .from('settings')
      .select('hero_image_url, stories_image_urls')
      .limit(1)
      .single();

    if (error) {
      return { stories_image_urls: [] };
    }

    return {
      hero_image_url: data.hero_image_url,
      stories_image_urls: data.stories_image_urls || [],
    };
  } catch {
    return { stories_image_urls: [] };
  }
}
