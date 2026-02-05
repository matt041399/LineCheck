import { Pressable, StyleSheet, View } from 'react-native';

import { router } from 'expo-router';

export default function HomeScreen() {
  return (
      <View style={styles.buttonContainer}>
        <View style={styles.buttonWrapper}>
      <Pressable
        style={styles.buttons}
        onPress={() => router.push('../forms/my-forms')}
      >
        View Forms
      </Pressable>
      </View>
      <Pressable
        style={styles.buttons}
        onPress={() => router.push('../forms/add-forms')}
      >
        Add Forms
      </Pressable>
      <Pressable
        style={styles.buttons}
        onPress={() => router.push('../forms/completed-forms')}
      >
        Completed Forms
      </Pressable>
      <Pressable
        style={styles.buttons}
        onPress={() => router.push('../users/signin')}
      >
        Test Login
      </Pressable>
      </View >
       
  );
}

const styles = StyleSheet.create({
  buttons: {
    backgroundColor: 'green',
    width: '50%',
    borderRadius: 50,
    padding: '1%',
    textAlign: 'center'
  },

  buttonContainer: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
  },

  buttonWrapper: {
    paddingTop: '5%',
    width: '50%',
    alignItems: 'center'

  }
});
