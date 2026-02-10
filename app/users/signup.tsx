import { useRouter } from 'expo-router';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { ref, set } from 'firebase/database';
import { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { auth, db } from '../firebase/firebase';

export default function Signup() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [location, setLocation] = useState('');

  const handleSignup = async () => {
    console.log('Signup pressed');
    console.log({ email, password, confirmPassword });
  
    if (!email || !password || !confirmPassword) {
      console.log('Missing fields detected');
      Alert.alert('Error', 'Please fill out all fields');
      return;
    }
  
    if (password !== confirmPassword) {
      console.log('Passwords do not match');
      Alert.alert('Error', 'Passwords do not match');
      return;
    }
  
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      console.log('User created:', userCredential.user.uid);
  
      // Assign location manually
      const assignedLocation = 'Test'; 
  
      await set(ref(db, `Users/${userCredential.user.uid}`), {
        email,
        location: assignedLocation,
        isAdmin: false,
        createdAt: Date.now(),
      });
  
      console.log('User written to RTDB');
      Alert.alert('Success', 'Account created!');
      router.push('/users/signin');
    } catch (error: any) {
      console.error('Signup error:', error);
      Alert.alert('Signup Error', error.message || 'Something went wrong');
    }
  };
  
  
  
  

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Sign Up</Text>

      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        style={styles.input}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <TextInput
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        style={styles.input}
        secureTextEntry
      />

      <TextInput
        placeholder="Confirm Password"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        style={styles.input}
        secureTextEntry
      />


<TouchableOpacity style={styles.button} onPress={handleSignup}>
  <Text style={styles.buttonText}>Sign Up</Text>
</TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20, backgroundColor: '#333' },
  header: { fontSize: 28, fontWeight: 'bold', color: 'white', marginBottom: 20 },
  input: { width: '100%', padding: 12, borderWidth: 1, borderColor: '#ccc', borderRadius: 8, marginBottom: 12, backgroundColor: 'white' },
  button: { width: '100%', padding: 14, backgroundColor: 'green', borderRadius: 8, alignItems: 'center' },
  buttonText: { color: 'white', fontSize: 18, fontWeight: '600' },
});
