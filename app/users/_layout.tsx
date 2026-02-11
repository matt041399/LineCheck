import { Stack } from 'expo-router';

export default function UsersLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false, // Hide header on all user screens
      }}
    />
  );
}