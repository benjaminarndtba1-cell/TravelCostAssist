// Forgot Password Screen für TravelCostAssist
// Ermöglicht Benutzern das Zurücksetzen ihres Passworts

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
  Snackbar
} from 'react-native-paper';
import { useAuth } from '../context/AuthContext';

const ForgotPasswordScreen = ({ navigation, route }) => {
  const [email, setEmail] = useState(route.params?.email || '');
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const { resetPassword } = useAuth();

  const handleResetPassword = async () => {
    if (!email.trim()) {
      showSnackbar('Bitte E-Mail-Adresse eingeben');
      return;
    }

    setIsLoading(true);

    const result = await resetPassword(email.trim());

    setIsLoading(false);

    if (result.success) {
      setEmailSent(true);
      showSnackbar('Passwort-Reset-E-Mail wurde versendet!');
    } else {
      showSnackbar(result.error || 'Fehler beim Versenden der E-Mail');
    }
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
        <View style={styles.header}>
          <Text style={styles.title}>Passwort vergessen?</Text>
          <Text style={styles.subtitle}>
            {emailSent
              ? 'E-Mail wurde versendet! Bitte überprüfe dein Postfach.'
              : 'Gib deine E-Mail-Adresse ein und wir senden dir einen Link zum Zurücksetzen deines Passworts.'}
          </Text>
        </View>

        {!emailSent && (
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
              onSubmitEditing={handleResetPassword}
            />

            <Button
              mode="contained"
              onPress={handleResetPassword}
              style={styles.resetButton}
              disabled={isLoading}
              loading={isLoading}
            >
              {isLoading ? 'Sende E-Mail...' : 'Passwort zurücksetzen'}
            </Button>
          </View>
        )}

        {emailSent && (
          <View style={styles.successContainer}>
            <Button
              mode="outlined"
              onPress={handleResetPassword}
              style={styles.resendButton}
              disabled={isLoading}
            >
              E-Mail erneut senden
            </Button>
          </View>
        )}

        <View style={styles.backContainer}>
          <Button
            mode="text"
            onPress={() => navigation.navigate('Login')}
            disabled={isLoading}
          >
            Zurück zum Login
          </Button>
        </View>
      </ScrollView>

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
    fontSize: 28,
    fontWeight: 'bold',
    color: '#6200ee',
    marginBottom: 16,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 20,
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
  resetButton: {
    paddingVertical: 8,
    marginBottom: 16,
  },
  successContainer: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
    marginTop: 16,
  },
  resendButton: {
    marginBottom: 16,
  },
  backContainer: {
    alignItems: 'center',
    marginTop: 16,
  },
});

export default ForgotPasswordScreen;
