module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    // react-native-reanimated's plugin must be listed last — see
    // https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/installation
    plugins: ["react-native-reanimated/plugin"],
  };
};
