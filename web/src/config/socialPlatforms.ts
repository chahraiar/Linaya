import { SocialPlatform } from '../store/personDetailStore';

export interface SocialPlatformConfig {
  platform: SocialPlatform;
  label: string;
  iconPath: string;
  placeholder: string;
}

export const SOCIAL_PLATFORMS: SocialPlatform[] = [
  'facebook',
  'instagram',
  'tiktok',
  'youtube',
  'snapchat',
  'x',
  'linkedin',
  'pinterest',
  'reddit',
  'twitch',
  'whatsapp',
  'telegram',
  'signal',
  'wechat',
  'vk',
  'autre',
];

export const SOCIAL_PLATFORM_CONFIGS: Record<SocialPlatform, SocialPlatformConfig> = {
  facebook: {
    platform: 'facebook',
    label: 'Facebook',
    iconPath: '/assets/facebook.png',
    placeholder: 'https://www.facebook.com/username',
  },
  instagram: {
    platform: 'instagram',
    label: 'Instagram',
    iconPath: '/assets/instagram.png',
    placeholder: 'https://www.instagram.com/username',
  },
  tiktok: {
    platform: 'tiktok',
    label: 'TikTok',
    iconPath: '/assets/tiktok.png',
    placeholder: 'https://www.tiktok.com/@username',
  },
  youtube: {
    platform: 'youtube',
    label: 'YouTube',
    iconPath: '/assets/youtube.png',
    placeholder: 'https://www.youtube.com/@username',
  },
  snapchat: {
    platform: 'snapchat',
    label: 'Snapchat',
    iconPath: '/assets/snapchat.png',
    placeholder: 'https://www.snapchat.com/add/username',
  },
  x: {
    platform: 'x',
    label: 'X (Twitter)',
    iconPath: '/assets/x.png',
    placeholder: 'https://x.com/username',
  },
  linkedin: {
    platform: 'linkedin',
    label: 'LinkedIn',
    iconPath: '/assets/linkedin.png',
    placeholder: 'https://www.linkedin.com/in/username',
  },
  pinterest: {
    platform: 'pinterest',
    label: 'Pinterest',
    iconPath: '/assets/pinterest.png',
    placeholder: 'https://www.pinterest.com/username',
  },
  reddit: {
    platform: 'reddit',
    label: 'Reddit',
    iconPath: '/assets/reddit.png',
    placeholder: 'https://www.reddit.com/user/username',
  },
  twitch: {
    platform: 'twitch',
    label: 'Twitch',
    iconPath: '/assets/twitch.png',
    placeholder: 'https://www.twitch.tv/username',
  },
  whatsapp: {
    platform: 'whatsapp',
    label: 'WhatsApp',
    iconPath: '/assets/whatsapp.png',
    placeholder: 'https://wa.me/1234567890',
  },
  telegram: {
    platform: 'telegram',
    label: 'Telegram',
    iconPath: '/assets/telegram.png',
    placeholder: 'https://t.me/username',
  },
  signal: {
    platform: 'signal',
    label: 'Signal',
    iconPath: '/assets/signal.png',
    placeholder: 'https://signal.me/#p/+1234567890',
  },
  wechat: {
    platform: 'wechat',
    label: 'WeChat',
    iconPath: '/assets/wechat.png',
    placeholder: 'WeChat ID ou QR code',
  },
  vk: {
    platform: 'vk',
    label: 'VKontakte',
    iconPath: '/assets/vk.png',
    placeholder: 'https://vk.com/username',
  },
  autre: {
    platform: 'autre',
    label: 'Autre',
    iconPath: '/assets/autre.png',
    placeholder: 'https://example.com',
  },
};

export const getSocialPlatformConfig = (platform: SocialPlatform): SocialPlatformConfig => {
  return SOCIAL_PLATFORM_CONFIGS[platform];
};

export const getSocialPlatformLabel = (platform: SocialPlatform): string => {
  return SOCIAL_PLATFORM_CONFIGS[platform].label;
};

