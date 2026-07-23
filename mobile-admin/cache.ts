import AsyncStorage from '@react-native-async-storage/async-storage';

export const getCachedUser = async () => {
  try {
    const data = await AsyncStorage.getItem('admin_user');
    return data ? JSON.parse(data) : null;
  } catch (e) {
    return null;
  }
};

export const saveUserToCache = async (user: any) => {
  try {
    await AsyncStorage.setItem('admin_user', JSON.stringify(user));
  } catch (e) {
    console.warn("Failed to cache user profile:", e);
  }
};

export const clearAllCache = async () => {
  try {
    await AsyncStorage.removeItem('admin_user');
  } catch (e) {
    console.warn("Failed to clear local cache:", e);
  }
};
