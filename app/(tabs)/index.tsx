import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export default function HomeScreen() {
  const NavigationCard = ({ title, description, route, color }: { 
    title: string; 
    description: string; 
    route: string;
    color: string;
  }) => (
    <Pressable
      style={[styles.card, { backgroundColor: color }]}
      onPress={() => router.push(route as any)}
    >
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardDescription}>{description}</Text>
      </View>
    </Pressable>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Dashboard</Text>
        
        <Pressable 
          style={styles.settingsButton}
          onPress={() => router.push('../users/settings')}
        >
          <Text style={styles.settingsIcon}>⚙️</Text>
        </Pressable>
      </View>

      <View style={styles.cardsContainer}>
        <NavigationCard
          title="View Forms"
          description="Browse and fill out available forms"
          route="../forms/my-forms"
          color="#4caf50"
        />
        
        <NavigationCard
          title="Add Forms"
          description="Create new form templates"
          route="../forms/add-forms"
          color="#2196f3"
        />
        
        <NavigationCard
          title="Completed Forms"
          description="Review submitted line checks"
          route="../forms/completed-forms"
          color="#ff9800"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: '5%',
  },
  header: {
    marginTop: '5%',
    marginBottom: '8%',
    position: 'relative',
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
  },
  settingsButton: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  settingsIcon: {
    fontSize: 24,
  },
  cardsContainer: {
    flex: 1,
    gap: 16,
  },
  card: {
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    minHeight: 120,
    justifyContent: 'center',
  },
  cardContent: {
    gap: 8,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  cardDescription: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
  },
});