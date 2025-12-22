module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // ...existing code...
      'react-native-reanimated/plugin',
    ],
  };
};
