// Register Screen für TravelCostAssist
// Ermöglicht neuen Benutzern die Registrierung

import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from 'react-native';
import {
  TextInput,
  Button,
  Text,
  Snackbar,
  HelperText
} from 'react-native-paper';
import { useAuth } from '../context/AuthContext';

const RegisterScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('');
  const [secureTextEntry, setSecureTextEntry] = useState(true);
  const [secureConfirmEntry, setSecureConfirmEntry] = useState(true);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { signUp } = useAuth();

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleRegister = async () => {
    // Validierung
    if (!name.trim()) {
      showSnackbar('Bitte Namen eingeben');
      return;
    }

    if (!email.trim()) {
      showSnackbar('Bitte E-Mail-Adresse eingeben');
      return;
    }

    if (!validateEmail(email.trim())) {
      showSnackbar('Bitte gültige E-Mail-Adresse eingeben');
      return;
    }

    if (!password) {
      showSnackbar('Bitte Passwort eingeben');
      return;
    }

    if (password.length < 6) {
      showSnackbar('Passwort muss mindestens 6 Zeichen lang sein');
      return;
    }

    if (password !== confirmPassword) {
      showSnackbar('Passwörter stimmen nicht überein');
      return;
    }

    setIsLoading(true);

    const userData = {
      name: name.trim(),
      department: department.trim(),
    };

    const result = await signUp(email.trim(), password, userData);

    setIsLoading(false);

    if (result.success) {
      showSnackbar('Registrierung erfolgreich!');
      // AuthContext navigiert automatisch zur App
    } else {
      showSnackbar(result.error || 'Registrierung fehlgeschlagen');
    }
  };

  const showSnackbar = (message) => {
    setSnackbarMessage(message);
    setSnackbarVisible(true);
  };

  const passwordsMatch = password === confirmPassword;
  const showPasswordMismatch = confirmPassword.length > 0 && !passwordsMatch;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Registrierung</Text>
          <Text style={styles.subtitle}>Erstelle deinen Account</Text>
        </View>

        {/* Register Form */}
        <View style={styles.form}>
          <TextInput
            label="Name *"
            value={name}
            onChangeText={setName}
            mode="outlined"
            autoCapitalize="words"
            autoComplete="name"
            textContentType="name"
            left={<TextInput.Icon icon="account" />}
            style={styles.input}
            disabled={isLoading}
          />

          <TextInput
            label="E-Mail *"
            value={email}
            onChangeText={setEmail}
            mode="outlined"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            textContentType="emailAddress"
            left={<TextInput.Icon icon="email" />}
            style={styles.input}
            disabled={isLoading}
          />

          <TextInput
            label="Abteilung"
            value={department}
            onChangeText={setDepartment}
            mode="outlined"
            autoCapitalize="words"
            left={<TextInput.Icon icon="office-building" />}
            style={styles.input}
            disabled={isLoading}
          />

          <TextInput
            label="Passwort *"
            value={password}
            onChangeText={setPassword}
            mode="outlined"
            secureTextEntry={secureTextEntry}
            autoCapitalize="none"
            autoComplete="password"
            textContentType="newPassword"
            left={<TextInput.Icon icon="lock" />}
            right={
              <TextInput.Icon
                icon={secureTextEntry ? 'eye' : 'eye-off'}
                onPress={() => setSecureTextEntry(!secureTextEntry)}
              />
            }
            style={styles.input}
            disabled={isLoading}
          />
          <HelperText type="info" visible={true}>
            Mindestens 6 Zeichen
          </HelperText>

          <TextInput
            label="Passwort bestätigen *"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            mode="outlined"
            secureTextEntry={secureConfirmEntry}
            autoCapitalize="none"
            autoComplete="password"
            textContentType="newPassword"
            left={<TextInput.Icon icon="lock-check" />}
            right={
              <TextInput.Icon
                icon={secureConfirmEntry ? 'eye' : 'eye-off'}
                onPress={() => setSecureConfirmEntry(!secureConfirmEntry)}
              />
            }
            style={styles.input}
            disabled={isLoading}
            error={showPasswordMismatch}
            onSubmitEditing={handleRegister}
          />
          <HelperText type="error" visible={showPasswordMismatch}>
            Passwörter stimmen nicht überein
          </HelperText>

          <Button
            mode="contained"
            onPress={handleRegister}
            style={styles.registerButton}
            disabled={isLoading}
            loading={isLoading}
          >
            {isLoading ? 'Registriere...' : 'Registrieren'}
          </Button>

          {/* Login Link */}
          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>Bereits registriert?</Text>
            <Button
              mode="text"
              onPress={() => navigation.navigate('Login')}
              disabled={isLoading}
            >
              Jetzt anmelden
            </Button>
          </View>
        </View>
      </ScrollView>

      {/* Snackbar */}
      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={4000}
        action={{
          label: 'OK',
          onPress: () => setSnackbarVisible(false),
        }}
      >
        {snackbarMessage}
      </Snackbar>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#6200ee',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  form: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  input: {
    marginBottom: 8,
    backgroundColor: 'white',
  },
  registerButton: {
    paddingVertical: 8,
    marginTop: 16,
    marginBottom: 16,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  loginText: {
    fontSize: 14,
    color: '#666',
  },
});

export default RegisterScreen;
