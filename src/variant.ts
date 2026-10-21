import Constants from 'expo-constants';

export const isPublic = Constants.expoConfig?.extra?.variant === 'public';
export const isPersonal = !isPublic;
