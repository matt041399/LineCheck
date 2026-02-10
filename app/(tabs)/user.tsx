import { get, ref } from 'firebase/database';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { auth, db } from '../firebase/firebase';


export default function UserSettings() {

    const [user, setUser] = useState();
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        async function fetchUserAndForms() {
            if (!auth.currentUser) return;

            const uid = auth.currentUser.uid;
            const userRef = ref(db, `Users/${uid}`);
            const userSnapshot = await get(userRef);

            if (userSnapshot.exists()) {
                const userData = userSnapshot.val();
                setUser(userData);
                setIsAdmin(userData.isAdmin ?? false);
            }
        }

        fetchUserAndForms();
    }, []);
    return (
        <View>
            {user ? (
                <>
                    <View>
                        <Pressable>
                            <Text style={styles.textbox}> {user.email}</Text>
                            <Text style={styles.textbox}> {user.location}</Text>
                            {user.isAdmin && <Text style={styles.textbox}> ADMIN</Text>}


                        </Pressable>

                    </View>
                </>)
                : <></>
            }

        </View>
    );
}

const styles = StyleSheet.create({
textbox :{
    color: "white"
}
});



