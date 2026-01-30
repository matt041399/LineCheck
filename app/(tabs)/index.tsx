import { Pressable, StyleSheet, View } from 'react-native';

import { router } from 'expo-router';

export default function HomeScreen() {
  return (
      <View>
      <Pressable
        style={{ padding: 20, backgroundColor: 'green', borderRadius: 10 }}
        onPress={() => router.push('../forms/my-forms')}
      >
        View Forms

      </Pressable>
      <Pressable
        style={{ padding: 20, backgroundColor: 'green', borderRadius: 10 }}
        onPress={() => router.push('../forms/add-forms')}
      >
        Add Forms
      </Pressable>
      </View>
       
  );
}

const styles = StyleSheet.create({
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepContainer: {
    gap: 8,
    marginBottom: 8,
  },
  reactLogo: {
    height: 178,
    width: 290,
    bottom: 0,
    left: 0,
    position: 'absolute',
  },
});
