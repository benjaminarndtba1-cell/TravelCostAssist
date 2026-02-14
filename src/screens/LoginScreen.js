// Login Screen für TravelCostAssist
// Ermöglicht Benutzern den Login mit E-Mail und Passwort

import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import {
  TextInput,
  Button,
  Text,
  Snackbar,
  ActivityIndicator,
  HelperText
} from 'react-native-paper';
import { useAuth } from '../context/AuthContext';

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [secureTextEntry, setSecureTextEntry] = useState(true);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { signIn } = useAuth();

  const handleLogin = async () => {
    // Validierung
    if (!email.trim()) {
      showSnackbar('Bitte E-Mail-Adresse eingeben');
      return;
    }

    if (!password) {
      showSnackbar('Bitte Passwort eingeben');
      return;
    }

    setIsLoading(true);

    const result = await signIn(email.trim(), password);

    setIsLoading(false);

    if (!result.success) {
      showSnackbar(result.error || 'Login fehlgeschlagen');
    }
    // Bei Erfolg navigiert AuthContext automatisch zur App
  };

  const handleForgotPassword = () => {
    if (!email.trim()) {
      showSnackbar('Bitte E-Mail-Adresse eingeben');
      return;
    }
    navigation.navigate('ForgotPassword', { email: email.trim() });
  };

  const showSnackbar = (message) => {
    setSnackbarMessage(message);
    setSnackbarVisible(true);
  };

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
        {/* App Logo/Title */}
        <View style={styles.header}>
          <Text style={styles.title}>TravelCostAssist</Text>
          <Text style={styles.subtitle}>Reisekostenabrechnung</Text>
        </View>

        {/* Login Form */}
        <View style={styles.form}>
          <TextInput
            label="E-Mail"
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
            label="Passwort"
            value={password}
            onChangeText={setPassword}
            mode="outlined"
            secureTextEntry={secureTextEntry}
            autoCapitalize="none"
            autoComplete="password"
            textContentType="password"
            left={<TextInput.Icon icon="lock" />}
            right={
              <TextInput.Icon
                icon={secureTextEntry ? 'eye' : 'eye-off'}
                onPress={() => setSecureTextEntry(!secureTextEntry)}
              />
            }
            style={styles.input}
            disabled={isLoading}
            onSubmitEditing={handleLogin}
          />

          <Button
            mode="text"
            onPress={handleForgotPassword}
            style={styles.forgotButton}
            disabled={isLoading}
          >
            Passwort vergessen?
          </Button>

          <Button
            mode="contained"
            onPress={handleLogin}
            style={styles.loginButton}
            disabled={isLoading}
            loading={isLoading}
          >
            {isLoading ? 'Anmelden...' : 'Anmelden'}
          </Button>

          {/* Registrierung Link */}
          <View style={styles.registerContainer}>
            <Text style={styles.registerText}>Noch kein Account?</Text>
            <Button
              mode="text"
              onPress={() => navigation.navigate('Register')}
              disabled={isLoading}
            >
              Jetzt registrieren
            </Button>
          </View>
        </View>
      </ScrollView>

      {/* Snackbar für Fehlermeldungen */}
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
    marginBottom: 40,
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
    marginBottom: 16,
    backgroundColor: 'white',
  },
  forgotButton: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  loginButton: {
    paddingVertical: 8,
    marginBottom: 16,
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  registerText: {
    fontSize: 14,
    color: '#666',
  },
});

export default LoginScreen;
