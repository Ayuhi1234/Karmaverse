// React Native Firebase is only used on iOS, to exchange the APNs token for an FCM
// token. Android already gets an FCM token from expo-notifications, so keep the
// Firebase native modules out of the Android build.
module.exports = {
  dependencies: {
    '@react-native-firebase/app': { platforms: { android: null } },
    '@react-native-firebase/messaging': { platforms: { android: null } },
  },
};
