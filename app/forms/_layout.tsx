import { Stack } from 'expo-router';

export default function FormsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false, // completely hides the top bar for all forms screens
        gestureEnabled: false, // disables swipe back gestures
      }}
    />
  );
}