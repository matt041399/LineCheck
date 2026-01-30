import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { TextInput } from 'react-native-gesture-handler';


export default function Linecheck() {


    const [values, setValues] = useState<{ [key: string]: string }>({});

    const forms = {
        title: "Test Line Check",
        items: [
            { id: 'burgers1', label: "Temperature of Burgers" },
            { id: 'burgers2', label: "Temperature of Burgers" },
            { id: 'burgers3', label: "Temperature of Burgers" },
            { id: 'burgers4', label: "Temperature of Burgers" },
            { id: 'burgers5', label: "Temperature of Burgers" },
            { id: 'chicken', label: "Temperature of Chicken" },
            { id: 'lettuce', label: "Temperature of Lettuce" },
        ],
    }

    return (
        <View style={styles.container}>
            <View style={styles.background}>
                <View style={styles.title}>
                    {forms.title}
                </View>
                <View style={styles.table}>
                    {forms.items.map((item) => (
                        <View key={item.id} style={styles.row}>
                            <Text style={styles.label}>{item.label}</Text>
                            <TextInput
                                placeholder="°F"
                                keyboardType="numeric"
                                style={styles.input}
                                value={values[item.id] || ''}
                                onChangeText={(text) => {
                                    let cleaned = text.replace(/[^0-9]/g, '');
                                    let num = parseInt(cleaned, 10);
                                    if (!isNaN(num) && num > 300) cleaned = '300';
                                    setValues((prev) => ({ ...prev, [item.id]: cleaned }));
                                }}
                            />
                        </View>
                    ))}

                </View>
                <View style={styles.submitContainer}>
                    <Pressable style={styles.submitButton}>
                        <Text style={styles.submitText}>Submit</Text>
                    </Pressable>
                </View>
            </View>
        </View>

    );
}



const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#333',
        alignItems: 'center',
        paddingTop: 24,
    },

    background: {
        width: '80%',
        backgroundColor: '#fff',
        padding: 10,
        borderWidth: 1,
        borderColor: 'black',
        alignItems: 'center',
        height: '100%',
    },

    table: {
        width: '100%',
        maxWidth: '90%',
        borderWidth: 1,
        borderColor: 'black',
    },

    row: {
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderColor: 'black',
        paddingVertical: '2%',
    },

    label: {
        width: '75%',
        fontSize: 24,
        textAlign: 'center',
        paddingLeft: '3%',
    },

    input: {
        width: '25%',
        height: '100%',
        borderLeftWidth: 1,
        borderColor: '#ccc',
        textAlign: 'center',
        fontSize: 24,
        paddingHorizontal: '5%',
    },

    title: {
        width: '25%',
        fontSize: 28,
        textAlign: 'center',
        paddingBottom: '2%',
        paddingTop: '2%',
    },


    submitContainer: {
        width: '15%',
        textAlign: 'center',
        paddingTop: '2%'
    },

    submitButton: {
        width: '100%',
        backgroundColor: 'green',
        borderWidth: 1,
        borderColor: 'blue',
        borderRadius: 50,
        paddingVertical: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },

    submitText: {
        color: 'white',
        fontSize: 20,
        fontWeight: '600',
        textAlign: 'center',
    },
});




