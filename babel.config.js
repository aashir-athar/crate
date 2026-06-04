// babel-preset-expo handles React Native Reanimated / Worklets automatically.
// The Unistyles Babel plugin processes style files under `src/` for the Nitro engine.
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [['react-native-unistyles/plugin', { root: 'src' }]],
  };
};
