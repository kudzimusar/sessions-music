import * as SecureStore from 'expo-secure-store';

const options={keychainAccessible:SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY};

export const secureSupabaseStorage={
  async getItem(key){return SecureStore.getItemAsync(key);},
  async setItem(key,value){await SecureStore.setItemAsync(key,String(value),options);},
  async removeItem(key){await SecureStore.deleteItemAsync(key);},
};
