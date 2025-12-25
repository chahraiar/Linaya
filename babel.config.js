module.exports = function(api) {
  api.cache(true);
  const isWeb = process.env.EXPO_PLATFORM === 'web';
  
  return {
    presets: [
      [
        'babel-preset-expo',
        {
          // Enable import.meta polyfill for Hermes (required for zustand)
          unstable_transformImportMeta: true,
        },
      ],
    ],
    plugins: [
      // Reanimated plugin désactivé temporairement à cause du problème Worklets avec Expo Go SDK 54
      // TODO: Réactiver quand Expo Go sera compatible
      // !isWeb && 'react-native-reanimated/plugin',
    ].filter(Boolean),
  };
};

