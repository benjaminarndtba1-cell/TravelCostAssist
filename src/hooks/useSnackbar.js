import { useState, useCallback } from 'react';

/**
 * Custom Hook für Snackbar-State-Management.
 * Vermeidet Code-Duplizierung über alle Screens hinweg.
 *
 * @param {number} duration - Anzeigedauer in ms (Standard: 3000)
 * @returns {{ visible, message, show, dismiss, snackbarProps }}
 */
export const useSnackbar = (duration = 3000) => {
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState('');

  const show = useCallback((msg) => {
    setMessage(msg);
    setVisible(true);
  }, []);

  const dismiss = useCallback(() => {
    setVisible(false);
  }, []);

  // Props die direkt an <Snackbar> übergeben werden können
  const snackbarProps = {
    visible,
    onDismiss: dismiss,
    duration,
    action: {
      label: 'OK',
      onPress: dismiss,
    },
    children: message,
  };

  return { visible, message, show, dismiss, snackbarProps };
};
