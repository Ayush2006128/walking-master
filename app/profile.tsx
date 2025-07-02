import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Button, HelperText, RadioButton, Snackbar, Text, TextInput } from 'react-native-paper';
import { initDB, saveProfile } from '../utils/db';

import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

type RootStackParamList = {
  goal: undefined;
  // add other screens here if needed
};

type ProfileScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'goal'>;
};

export default function ProfileScreen({ navigation }: ProfileScreenProps) {
  const [name, setName] = useState('');
  const [gender, setGender] = useState('male');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [error, setError] = useState('');
  const [snackbar, setSnackbar] = useState(false);

  useEffect(() => {
    initDB();
  }, []);

  const handleSubmit = async () => {
    if (!name || !height || !weight) {
      setError('All fields are required.');
      return;
    }
    if (isNaN(Number(height)) || isNaN(Number(weight))) {
      setError('Height and weight must be numbers.');
      return;
    }
    try {
      await saveProfile({ name, gender, height: Number(height), weight: Number(weight), goal: undefined });
      navigation.replace('goal');
    } catch (e) {
      setError('Failed to save profile.');
      setSnackbar(true);
    }
  };

  return (
    <View style={{ padding: 20 }}>
      <Text variant="titleLarge">Create Profile</Text>
      <TextInput label="Name" value={name} onChangeText={setName} style={{ marginBottom: 10 }} />
      <RadioButton.Group onValueChange={setGender} value={gender}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
          <RadioButton value="male" /><Text>Male</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 20 }}>
            <RadioButton value="female" /><Text>Female</Text>
          </View>
        </View>
      </RadioButton.Group>
      <TextInput label="Height (cm)" value={height} onChangeText={setHeight} keyboardType="numeric" style={{ marginBottom: 10 }} />
      <TextInput label="Weight (kg)" value={weight} onChangeText={setWeight} keyboardType="numeric" style={{ marginBottom: 10 }} />
      <HelperText type="error" visible={!!error}>{error}</HelperText>
      <Button mode="contained" onPress={handleSubmit}>Continue</Button>
      <Snackbar visible={snackbar} onDismiss={() => setSnackbar(false)}>{error}</Snackbar>
    </View>
  );
}
