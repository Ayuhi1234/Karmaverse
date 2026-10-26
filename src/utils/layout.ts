import { Dimensions } from 'react-native';

export const SCREEN_WIDTH = Dimensions.get('window').width;
export const SCREEN_HEIGHT = Dimensions.get('window').height;

// Native bottom tab bar height, before the safe-area inset is added.
export const TAB_BAR_BASE_HEIGHT = SCREEN_WIDTH >= 768 ? 80 : 70;
