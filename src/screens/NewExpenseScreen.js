import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  Platform,
  KeyboardAvoidingView,
  Image,
  TouchableOpacity,
} from 'react-native';
import {
  Text,
  TextInput,
  Button,
  Surface,
  Icon,
  Snackbar,
  Chip,
  ActivityIndicator,
  TouchableRipple,
} from 'react-native-paper';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
// Einfache ID-Generierung ohne crypto.getRandomValues() (React Native kompatibel)
const generateId = () =>
  Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 9);
import theme from '../theme';
import EXPENSE_CATEGORIES, { getCategoryById, getPresetsForCategory } from '../utils/categories';
import { addExpense, updateExpense, loadTrips } from '../utils/storage';
import VAT_RATES, {
  getVatRateById,
  calculateNetAmount,
  calculateVatAmount,
} from '../utils/vatRates';
import {
  calculateDistanceBetweenAddresses,
  geocodeAddress,
  calculateDistance,
  calculateMileageCost,
  KILOMETER_RATE,
} from '../utils/distanceService';

const NewExpenseScreen = ({ navigation, route }) => {
  // Check if we came from a specific trip (via stack navigation)
  const routeTripId = route?.params?.tripId || null;
  const fromTrip = !!routeTripId;

  // Edit mode: pre-fill with existing expense data
  const editExpense = route?.params?.expense || null;
  const isEditMode = !!editExpense;

  // -- Category & trip state --
  const [category, setCategory] = useState(editExpense?.category || 'kilometer');
  const [selectedTripId, setSelectedTripId] = useState(routeTripId || editExpense?.tripId || null);
  const [trips, setTrips] = useState([]);

  // -- Preset state --
  const [selectedPresetId, setSelectedPresetId] = useState(null);

  // -- VAT state --
  const [vatRateId, setVatRateId] = useState(editExpense?.vatRateId || 'vat_0');

  // -- Amount state --
  const [amount, setAmount] = useState(
    editExpense ? String(parseFloat(editExpense.grossAmount || editExpense.amount) || '').replace('.', ',') : ''
  );

  // -- Kilometer mode state --
  const [startAddress, setStartAddress] = useState(editExpense?.startAddress || '');
  const [endAddress, setEndAddress] = useState(editExpense?.endAddress || '');
  const [licensePlate, setLicensePlate] = useState(editExpense?.licensePlate || '');
  const [tripDirection, setTripDirection] = useState(editExpense?.tripDirection || 'roundtrip');
  const [distanceResult, setDistanceResult] = useState(
    editExpense?.distanceKmOneWay ? {
      distanceKm: editExpense.distanceKmOneWay,
      durationMinutes: (editExpense.durationMinutes || 0) / (editExpense.tripDirection === 'roundtrip' ? 2 : 1),
      distanceText: `${editExpense.distanceKmOneWay.toFixed(1).replace('.', ',')} km`,
      durationText: '',
    } : null
  );
  const [calculatingDistance, setCalculatingDistance] = useState(false);
  const [manualDistanceInput, setManualDistanceInput] = useState(
    editExpense?.isManualDistance && editExpense?.distanceKmOneWay
      ? String(editExpense.distanceKmOneWay).replace('.', ',')
      : ''
  );
  const [isManualDistance, setIsManualDistance] = useState(editExpense?.isManualDistance || false);

  // -- Geocoding autocomplete state --
  const [startSuggestions, setStartSuggestions] = useState([]);
  const [endSuggestions, setEndSuggestions] = useState([]);
  const [showStartSuggestions, setShowStartSuggestions] = useState(false);
  const [showEndSuggestions, setShowEndSuggestions] = useState(false);
  const [searchingStart, setSearchingStart] = useState(false);
  const [searchingEnd, setSearchingEnd] = useState(false);
  const startSearchTimer = useRef(null);
  const endSearchTimer = useRef(null);
  // Coordinates stored from selected suggestions for direct distance calc
  const [startCoords, setStartCoords] = useState(null);
  const [endCoords, setEndCoords] = useState(null);

  // -- Common fields --
  const [description, setDescription] = useState(editExpense?.description || '');
  const [date, setDate] = useState(editExpense?.date ? new Date(editExpense.date) : new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  // -- Receipt photos (multiple) --
  const [receiptUris, setReceiptUris] = useState(editExpense?.receiptUris || []);

  // -- UI state --
  const [saving, setSaving] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  // Load available trips on mount
  useEffect(() => {
    const loadAvailableTrips = async () => {
      const loadedTrips = await loadTrips();
      // In edit mode, show the expense's trip regardless of status; otherwise only drafts
      const availableTrips = isEditMode
        ? loadedTrips.filter((t) => t.status === 'entwurf' || t.status === 'abgeschlossen' || t.id === editExpense?.tripId)
        : loadedTrips.filter((t) => t.status === 'entwurf');
      setTrips(availableTrips);
      // If coming from a specific trip, keep that selection; otherwise select first
      if (!routeTripId && !isEditMode && availableTrips.length > 0) {
        setSelectedTripId(availableTrips[0].id);
      }
    };
    loadAvailableTrips();
  }, [routeTripId]);

  // Debounced geocoding search for start address
  const handleStartAddressChange = (text) => {
    setStartAddress(text);
    setDistanceResult(null);
    setStartCoords(null);
    if (startSearchTimer.current) clearTimeout(startSearchTimer.current);
    if (text.trim().length < 3) {
      setStartSuggestions([]);
      setShowStartSuggestions(false);
      setSearchingStart(false);
      return;
    }
    setSearchingStart(true);
    startSearchTimer.current = setTimeout(async () => {
      const result = await geocodeAddress(text.trim());
      if (result.success) {
        setStartSuggestions(result.results);
        setShowStartSuggestions(true);
      } else {
        setStartSuggestions([]);
        setShowStartSuggestions(false);
      }
      setSearchingStart(false);
    }, 800);
  };

  // Debounced geocoding search for end address
  const handleEndAddressChange = (text) => {
    setEndAddress(text);
    setDistanceResult(null);
    setEndCoords(null);
    if (endSearchTimer.current) clearTimeout(endSearchTimer.current);
    if (text.trim().length < 3) {
      setEndSuggestions([]);
      setShowEndSuggestions(false);
      setSearchingEnd(false);
      return;
    }
    setSearchingEnd(true);
    endSearchTimer.current = setTimeout(async () => {
      const result = await geocodeAddress(text.trim());
      if (result.success) {
        setEndSuggestions(result.results);
        setShowEndSuggestions(true);
      } else {
        setEndSuggestions([]);
        setShowEndSuggestions(false);
      }
      setSearchingEnd(false);
    }, 800);
  };

  // Handle selecting a start address suggestion
  const handleSelectStartSuggestion = (suggestion) => {
    setStartAddress(suggestion.displayName);
    setStartCoords({ lat: suggestion.lat, lon: suggestion.lon });
    setStartSuggestions([]);
    setShowStartSuggestions(false);
    setDistanceResult(null);
  };

  // Handle selecting an end address suggestion
  const handleSelectEndSuggestion = (suggestion) => {
    setEndAddress(suggestion.displayName);
    setEndCoords({ lat: suggestion.lat, lon: suggestion.lon });
    setEndSuggestions([]);
    setShowEndSuggestions(false);
    setDistanceResult(null);
  };

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (startSearchTimer.current) clearTimeout(startSearchTimer.current);
      if (endSearchTimer.current) clearTimeout(endSearchTimer.current);
    };
  }, []);

  // When category changes, update the default VAT rate and reset preset
  useEffect(() => {
    const cat = getCategoryById(category);
    if (cat && cat.defaultVat) {
      setVatRateId(cat.defaultVat);
    }
    setSelectedPresetId(null);
  }, [category]);

  // When distance result or direction changes in kilometer mode, auto-calculate amount
  useEffect(() => {
    if (category === 'kilometer' && distanceResult) {
      const multiplier = tripDirection === 'roundtrip' ? 2 : 1;
      const totalKm = distanceResult.distanceKm * multiplier;
      const cost = calculateMileageCost(totalKm);
      setAmount(cost.toFixed(2).replace('.', ','));
    }
  }, [distanceResult, category, tripDirection]);

  // Handle manual distance input
  const handleManualDistanceChange = (text) => {
    setManualDistanceInput(text);
    const km = parseFloat(text.replace(',', '.'));
    if (!isNaN(km) && km > 0) {
      setDistanceResult({
        distanceKm: km,
        durationMinutes: 0,
        distanceText: `${km.toFixed(1).replace('.', ',')} km`,
        durationText: '',
      });
      setIsManualDistance(true);
    } else {
      setDistanceResult(null);
      setIsManualDistance(false);
    }
  };

  // -- Helpers --
  const parseAmount = (text) => {
    const parsed = parseFloat(text.replace(',', '.'));
    return isNaN(parsed) ? 0 : parsed;
  };

  const grossAmount = parseAmount(amount);
  const netAmount = calculateNetAmount(grossAmount, vatRateId);
  const vatAmount = calculateVatAmount(grossAmount, vatRateId);

  const formattedDate = format(date, 'EEEE, dd. MMMM yyyy', { locale: de });

  // -- Date handling --
  const onDateChange = (event, selectedDate) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setDate(selectedDate);
    }
  };

  // -- Distance calculation --
  const handleCalculateDistance = async () => {
    if (!startAddress.trim()) {
      setSnackbarMessage('Bitte geben Sie eine Startadresse ein.');
      setSnackbarVisible(true);
      return;
    }
    if (!endAddress.trim()) {
      setSnackbarMessage('Bitte geben Sie eine Zieladresse ein.');
      setSnackbarVisible(true);
      return;
    }

    setCalculatingDistance(true);
    setDistanceResult(null);
    setIsManualDistance(false);
    setManualDistanceInput('');

    let result;

    if (startCoords && endCoords) {
      // Both addresses were selected from suggestions - use stored coordinates directly
      const distanceCalc = await calculateDistance(
        startCoords.lat, startCoords.lon,
        endCoords.lat, endCoords.lon
      );

      if (distanceCalc.success) {
        result = {
          success: true,
          start: { address: startAddress, ...startCoords },
          end: { address: endAddress, ...endCoords },
          distanceKm: distanceCalc.distanceKm,
          durationMinutes: distanceCalc.durationMinutes,
          distanceText: distanceCalc.distanceText,
          durationText: distanceCalc.durationText,
        };
      } else {
        result = distanceCalc;
      }
    } else if (startCoords) {
      // Only start from suggestion, geocode end
      const endGeocode = await geocodeAddress(endAddress.trim());
      if (endGeocode.success && endGeocode.results.length > 0) {
        const end = endGeocode.results[0];
        const distanceCalc = await calculateDistance(
          startCoords.lat, startCoords.lon, end.lat, end.lon
        );
        if (distanceCalc.success) {
          result = {
            success: true,
            start: { address: startAddress, ...startCoords },
            end: { address: end.displayName, lat: end.lat, lon: end.lon },
            distanceKm: distanceCalc.distanceKm,
            durationMinutes: distanceCalc.durationMinutes,
            distanceText: distanceCalc.distanceText,
            durationText: distanceCalc.durationText,
          };
        } else {
          result = distanceCalc;
        }
      } else {
        result = endGeocode;
      }
    } else if (endCoords) {
      // Only end from suggestion, geocode start
      const startGeocode = await geocodeAddress(startAddress.trim());
      if (startGeocode.success && startGeocode.results.length > 0) {
        const start = startGeocode.results[0];
        const distanceCalc = await calculateDistance(
          start.lat, start.lon, endCoords.lat, endCoords.lon
        );
        if (distanceCalc.success) {
          result = {
            success: true,
            start: { address: start.displayName, lat: start.lat, lon: start.lon },
            end: { address: endAddress, ...endCoords },
            distanceKm: distanceCalc.distanceKm,
            durationMinutes: distanceCalc.durationMinutes,
            distanceText: distanceCalc.distanceText,
            durationText: distanceCalc.durationText,
          };
        } else {
          result = distanceCalc;
        }
      } else {
        result = startGeocode;
      }
    } else {
      // Fallback: geocode both addresses
      result = await calculateDistanceBetweenAddresses(
        startAddress.trim(),
        endAddress.trim()
      );
    }

    setCalculatingDistance(false);

    if (result.success) {
      setDistanceResult(result);
    } else {
      setSnackbarMessage(result.error || 'Entfernungsberechnung fehlgeschlagen.');
      setSnackbarVisible(true);
    }
  };

  // -- Receipt photo handling (multiple) --
  const pickImage = async () => {
    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (permissionResult.granted === false) {
      Alert.alert(
        'Berechtigung erforderlich',
        'Die App benötigt Zugriff auf Ihre Fotos, um Belege hinzuzufügen.'
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setReceiptUris((prev) => [...prev, result.assets[0].uri]);
    }
  };

  const takePhoto = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();

    if (permissionResult.granted === false) {
      Alert.alert(
        'Berechtigung erforderlich',
        'Die App benötigt Zugriff auf die Kamera, um Belege zu fotografieren.'
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setReceiptUris((prev) => [...prev, result.assets[0].uri]);
    }
  };

  const showReceiptOptions = () => {
    Alert.alert('Beleg hinzufügen', 'Wie möchten Sie den Beleg hinzufügen?', [
      { text: 'Kamera', onPress: takePhoto },
      { text: 'Aus Galerie', onPress: pickImage },
      { text: 'Abbrechen', style: 'cancel' },
    ]);
  };

  const removeReceipt = (index) => {
    setReceiptUris((prev) => prev.filter((_, i) => i !== index));
  };

  // -- Validation --
  const validateForm = () => {
    if (category === 'kilometer') {
      if (!isManualDistance) {
        if (!startAddress.trim()) {
          setSnackbarMessage('Bitte geben Sie eine Startadresse ein.');
          setSnackbarVisible(true);
          return false;
        }
        if (!endAddress.trim()) {
          setSnackbarMessage('Bitte geben Sie eine Zieladresse ein.');
          setSnackbarVisible(true);
          return false;
        }
      }
      if (!distanceResult) {
        setSnackbarMessage('Bitte berechnen Sie die Entfernung oder geben Sie sie manuell ein.');
        setSnackbarVisible(true);
        return false;
      }
    } else {
      if (!amount || parseAmount(amount) <= 0) {
        setSnackbarMessage('Bitte geben Sie einen gültigen Betrag ein.');
        setSnackbarVisible(true);
        return false;
      }
    }

    if (!selectedTripId) {
      setSnackbarMessage(
        'Bitte erstellen Sie zuerst eine Reise unter dem Tab "Reisen".'
      );
      setSnackbarVisible(true);
      return false;
    }

    return true;
  };

  // -- Save --
  const handleSave = async () => {
    if (!validateForm()) return;

    setSaving(true);

    const expense = {
      id: isEditMode ? editExpense.id : generateId(),
      category,
      grossAmount: grossAmount,
      netAmount: Math.round(netAmount * 100) / 100,
      vatAmount: Math.round(vatAmount * 100) / 100,
      vatRateId,
      amount: grossAmount,
      description: description.trim(),
      date: date.toISOString(),
      receiptUris,
      tripId: selectedTripId,
      currency: 'EUR',
      createdAt: isEditMode ? editExpense.createdAt : new Date().toISOString(),
      updatedAt: isEditMode ? new Date().toISOString() : undefined,
    };

    // Add kilometer-specific fields
    if (category === 'kilometer' && distanceResult) {
      const multiplier = tripDirection === 'roundtrip' ? 2 : 1;
      expense.startAddress = startAddress.trim();
      expense.endAddress = endAddress.trim();
      expense.distanceKm = distanceResult.distanceKm * multiplier;
      expense.distanceKmOneWay = distanceResult.distanceKm;
      expense.durationMinutes = distanceResult.durationMinutes * multiplier;
      expense.tripDirection = tripDirection;
      expense.isManualDistance = isManualDistance;
      if (licensePlate.trim()) {
        expense.licensePlate = licensePlate.trim().toUpperCase();
      }
    }

    const success = isEditMode
      ? await updateExpense(editExpense.id, expense)
      : await addExpense(expense);

    setSaving(false);

    if (success) {
      if (isEditMode) {
        setSnackbarMessage('Position erfolgreich aktualisiert!');
        setSnackbarVisible(true);
        setTimeout(() => navigation.goBack(), 600);
      } else {
      // Reset form for potential next entry
      const resetForm = () => {
        setAmount('');
        setDescription('');
        setDate(new Date());
        setReceiptUris([]);
        setCategory('kilometer');
        setSelectedPresetId(null);
        setStartAddress('');
        setEndAddress('');
        setLicensePlate('');
        setTripDirection('roundtrip');
        setDistanceResult(null);
        setManualDistanceInput('');
        setIsManualDistance(false);
        setStartCoords(null);
        setEndCoords(null);
        setStartSuggestions([]);
        setEndSuggestions([]);
      };

      if (fromTrip) {
        // Coming from trip detail: ask if user wants to add another position
        Alert.alert(
          'Position gespeichert',
          'Möchten Sie eine weitere Position zu dieser Reise hinzufügen?',
          [
            {
              text: 'Zurück zur Reise',
              onPress: () => {
                resetForm();
                navigation.goBack();
              },
            },
            {
              text: 'Weitere Position',
              onPress: () => {
                resetForm();
                setSnackbarMessage('Position gespeichert. Neue Position erfassen.');
                setSnackbarVisible(true);
              },
            },
          ]
        );
      } else {
        setSnackbarMessage('Ausgabe erfolgreich gespeichert!');
        setSnackbarVisible(true);
        resetForm();

        // Navigate back to dashboard after short delay
        setTimeout(() => {
          navigation.navigate('Übersicht');
        }, 800);
      }
      }
    } else {
      setSnackbarMessage(
        'Fehler beim Speichern. Bitte versuchen Sie es erneut.'
      );
      setSnackbarVisible(true);
    }
  };

  // -- Preset selection handler --
  const handlePresetSelect = (preset) => {
    if (selectedPresetId === preset.id) {
      // Deselect: reset to category default
      setSelectedPresetId(null);
      const cat = getCategoryById(category);
      if (cat && cat.defaultVat) {
        setVatRateId(cat.defaultVat);
      }
      setDescription('');
    } else {
      setSelectedPresetId(preset.id);
      setVatRateId(preset.vatRateId);
      setDescription(preset.label);
    }
  };

  const currentPresets = getPresetsForCategory(category);

  // -- Render helpers --
  const isKilometerMode = category === 'kilometer';

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 20}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Trip Selection */}
        {fromTrip ? (
          <Surface style={styles.section} elevation={1}>
            <View style={styles.tripFixedContainer}>
              <Icon source="airplane" size={20} color={theme.colors.primary} />
              <Text variant="bodyMedium" style={styles.tripFixedLabel}>
                Reise: {trips.find((t) => t.id === selectedTripId)?.name || 'Wird geladen...'}
              </Text>
            </View>
          </Surface>
        ) : trips.length > 0 ? (
          <Surface style={styles.section} elevation={1}>
            <Text variant="titleSmall" style={styles.sectionTitle}>
              Reise zuordnen
            </Text>
            <View style={styles.tripSelection}>
              {trips.map((trip) => (
                <TouchableRipple
                  key={trip.id}
                  onPress={() => setSelectedTripId(trip.id)}
                  style={[
                    styles.tripOption,
                    selectedTripId === trip.id && styles.tripOptionSelected,
                  ]}
                >
                  <View style={styles.tripOptionContent}>
                    <Icon
                      source={
                        selectedTripId === trip.id
                          ? 'radiobox-marked'
                          : 'radiobox-blank'
                      }
                      size={20}
                      color={
                        selectedTripId === trip.id
                          ? theme.colors.primary
                          : theme.colors.textLight
                      }
                    />
                    <Text
                      variant="bodyMedium"
                      style={[
                        styles.tripOptionLabel,
                        selectedTripId === trip.id &&
                          styles.tripOptionLabelSelected,
                      ]}
                    >
                      {trip.name}
                    </Text>
                  </View>
                </TouchableRipple>
              ))}
            </View>
          </Surface>
        ) : (
          <Surface style={styles.section} elevation={1}>
            <View style={styles.noTripsContainer}>
              <Icon
                source="alert-circle-outline"
                size={24}
                color={theme.colors.warning}
              />
              <Text variant="bodyMedium" style={styles.noTripsText}>
                Keine offene Reise vorhanden. Bitte erstellen Sie zuerst eine
                Reise.
              </Text>
            </View>
          </Surface>
        )}

        {/* Category Selection (horizontal chips) */}
        <Surface style={styles.section} elevation={1}>
          <Text variant="titleSmall" style={styles.sectionTitle}>
            Kategorie
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipRow}
          >
            {EXPENSE_CATEGORIES.map((cat) => (
              <Chip
                key={cat.id}
                icon={cat.icon}
                selected={category === cat.id}
                onPress={() => setCategory(cat.id)}
                style={[
                  styles.categoryChip,
                  category === cat.id && styles.categoryChipSelected,
                ]}
                textStyle={[
                  styles.categoryChipText,
                  category === cat.id && styles.categoryChipTextSelected,
                ]}
                selectedColor={
                  category === cat.id ? '#FFFFFF' : theme.colors.text
                }
                showSelectedOverlay={false}
              >
                {cat.label}
              </Chip>
            ))}
          </ScrollView>
          <Text variant="bodySmall" style={styles.categoryHint}>
            {getCategoryById(category).description}
          </Text>
        </Surface>

        {/* Preset Selection (quick pick for common items) */}
        {currentPresets.length > 0 && (
          <Surface style={styles.section} elevation={1}>
            <Text variant="titleSmall" style={styles.sectionTitle}>
              Häufige Positionen
            </Text>
            <View style={styles.presetList}>
              {currentPresets.map((preset) => {
                const isSelected = selectedPresetId === preset.id;
                const presetVatRate = getVatRateById(preset.vatRateId);
                return (
                  <TouchableRipple
                    key={preset.id}
                    onPress={() => handlePresetSelect(preset)}
                    style={[
                      styles.presetItem,
                      isSelected && styles.presetItemSelected,
                    ]}
                  >
                    <View style={styles.presetItemContent}>
                      <Icon
                        source={preset.icon}
                        size={20}
                        color={isSelected ? theme.colors.primary : theme.colors.textSecondary}
                      />
                      <View style={styles.presetItemText}>
                        <Text
                          variant="bodyMedium"
                          style={[
                            styles.presetItemLabel,
                            isSelected && styles.presetItemLabelSelected,
                          ]}
                        >
                          {preset.label}
                        </Text>
                        <Text variant="bodySmall" style={styles.presetItemVat}>
                          {presetVatRate.label}
                        </Text>
                      </View>
                      {isSelected && (
                        <Icon source="check-circle" size={20} color={theme.colors.primary} />
                      )}
                    </View>
                  </TouchableRipple>
                );
              })}
            </View>

            {/* Kennzeichen-Feld bei Kilometerpauschale eigener PKW */}
            {selectedPresetId && currentPresets.find((p) => p.id === selectedPresetId)?.hasLicensePlate && (
              <View style={styles.licensePlateContainer}>
                <TextInput
                  mode="outlined"
                  label="KFZ-Kennzeichen"
                  value={licensePlate}
                  onChangeText={setLicensePlate}
                  autoCapitalize="characters"
                  placeholder="z.B. M-AB 1234"
                  left={<TextInput.Icon icon="car" />}
                  style={styles.input}
                  outlineColor={theme.colors.border}
                  activeOutlineColor={theme.colors.primary}
                />
              </View>
            )}
          </Surface>
        )}

        {/* VAT Rate Selection */}
        <Surface style={styles.section} elevation={1}>
          <View style={styles.vatHeader}>
            <Text variant="titleSmall" style={[styles.sectionTitle, { marginBottom: 0 }]}>
              Umsatzsteuersatz
            </Text>
            {selectedPresetId && (
              <Text variant="bodySmall" style={styles.vatAutoHint}>
                automatisch gesetzt
              </Text>
            )}
          </View>
          <View style={styles.vatRow}>
            {VAT_RATES.map((vat) => (
              <Chip
                key={vat.id}
                selected={vatRateId === vat.id}
                onPress={() => {
                  setVatRateId(vat.id);
                  setSelectedPresetId(null);
                }}
                style={[
                  styles.vatChip,
                  vatRateId === vat.id && styles.vatChipSelected,
                ]}
                textStyle={[
                  styles.vatChipText,
                  vatRateId === vat.id && styles.vatChipTextSelected,
                ]}
                selectedColor={
                  vatRateId === vat.id ? '#FFFFFF' : theme.colors.text
                }
                showSelectedOverlay={false}
              >
                {vat.label}
              </Chip>
            ))}
          </View>
          <Text variant="bodySmall" style={styles.vatHint}>
            {getVatRateById(vatRateId).description}
          </Text>
        </Surface>

        {/* Kilometer Mode */}
        {isKilometerMode && (
          <Surface style={styles.section} elevation={1}>
            <Text variant="titleSmall" style={styles.sectionTitle}>
              Kilometerabrechnung
            </Text>
            <View>
              <TextInput
                mode="outlined"
                label="Startadresse"
                value={startAddress}
                onChangeText={handleStartAddressChange}
                left={<TextInput.Icon icon="map-marker" />}
                right={searchingStart ? <TextInput.Icon icon="loading" /> : startCoords ? <TextInput.Icon icon="check-circle" color={theme.colors.success} /> : null}
                style={styles.input}
                outlineColor={startCoords ? theme.colors.success : theme.colors.border}
                activeOutlineColor={theme.colors.primary}
              />
              {showStartSuggestions && startSuggestions.length > 0 && (
                <View style={styles.suggestionsContainer}>
                  {startSuggestions.map((item, index) => (
                    <TouchableOpacity
                      key={`start-${index}`}
                      style={styles.suggestionItem}
                      onPress={() => handleSelectStartSuggestion(item)}
                    >
                      <Icon source="map-marker" size={16} color={theme.colors.primary} />
                      <Text variant="bodySmall" style={styles.suggestionText} numberOfLines={2}>
                        {item.displayName}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
            <View style={styles.spacerSm} />
            <View>
              <TextInput
                mode="outlined"
                label="Zieladresse"
                value={endAddress}
                onChangeText={handleEndAddressChange}
                left={<TextInput.Icon icon="map-marker-check" />}
                right={searchingEnd ? <TextInput.Icon icon="loading" /> : endCoords ? <TextInput.Icon icon="check-circle" color={theme.colors.success} /> : null}
                style={styles.input}
                outlineColor={endCoords ? theme.colors.success : theme.colors.border}
                activeOutlineColor={theme.colors.primary}
              />
              {showEndSuggestions && endSuggestions.length > 0 && (
                <View style={styles.suggestionsContainer}>
                  {endSuggestions.map((item, index) => (
                    <TouchableOpacity
                      key={`end-${index}`}
                      style={styles.suggestionItem}
                      onPress={() => handleSelectEndSuggestion(item)}
                    >
                      <Icon source="map-marker-check" size={16} color={theme.colors.primary} />
                      <Text variant="bodySmall" style={styles.suggestionText} numberOfLines={2}>
                        {item.displayName}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
            <View style={styles.spacerMd} />
            <Button
              mode="contained"
              icon="map-search"
              onPress={handleCalculateDistance}
              loading={calculatingDistance}
              disabled={calculatingDistance}
              buttonColor={theme.colors.primary}
              textColor="#FFFFFF"
              style={styles.calculateButton}
            >
              Entfernung berechnen
            </Button>

            {/* Manuelle Entfernungseingabe */}
            <View style={styles.manualDivider}>
              <View style={styles.manualDividerLine} />
              <Text variant="bodySmall" style={styles.manualDividerText}>oder</Text>
              <View style={styles.manualDividerLine} />
            </View>
            <TextInput
              mode="outlined"
              label="Entfernung manuell eingeben (km)"
              value={manualDistanceInput}
              onChangeText={handleManualDistanceChange}
              keyboardType="decimal-pad"
              right={<TextInput.Affix text="km" />}
              left={<TextInput.Icon icon="pencil-ruler" />}
              style={styles.input}
              outlineColor={isManualDistance ? theme.colors.warning : theme.colors.border}
              activeOutlineColor={theme.colors.warning}
            />
            {isManualDistance && (
              <View style={styles.manualHintRow}>
                <Icon source="alert-circle-outline" size={14} color={theme.colors.warning} />
                <Text variant="bodySmall" style={styles.manualHintText}>
                  Manuelle Eingabe - Entfernung nicht automatisch ermittelt
                </Text>
              </View>
            )}

            {/* Hin-/Rückfahrt Auswahl */}
            <View style={styles.directionRow}>
              <Chip
                icon="swap-horizontal"
                selected={tripDirection === 'roundtrip'}
                onPress={() => setTripDirection('roundtrip')}
                style={[
                  styles.directionChip,
                  tripDirection === 'roundtrip' && styles.directionChipSelected,
                ]}
                textStyle={[
                  styles.directionChipText,
                  tripDirection === 'roundtrip' && styles.directionChipTextSelected,
                ]}
                selectedColor={tripDirection === 'roundtrip' ? '#FFFFFF' : theme.colors.text}
                showSelectedOverlay={false}
              >
                Hin- und Rückfahrt
              </Chip>
              <Chip
                icon="arrow-right"
                selected={tripDirection === 'oneway'}
                onPress={() => setTripDirection('oneway')}
                style={[
                  styles.directionChip,
                  tripDirection === 'oneway' && styles.directionChipSelected,
                ]}
                textStyle={[
                  styles.directionChipText,
                  tripDirection === 'oneway' && styles.directionChipTextSelected,
                ]}
                selectedColor={tripDirection === 'oneway' ? '#FFFFFF' : theme.colors.text}
                showSelectedOverlay={false}
              >
                Nur Hinfahrt
              </Chip>
            </View>

            {calculatingDistance && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator
                  animating
                  size="small"
                  color={theme.colors.primary}
                />
                <Text variant="bodySmall" style={styles.loadingText}>
                  Route wird berechnet...
                </Text>
              </View>
            )}

            {distanceResult && (
              <View style={styles.distanceResultContainer}>
                {isManualDistance && (
                  <View style={styles.manualBadgeRow}>
                    <Icon source="pencil" size={14} color={theme.colors.warning} />
                    <Text variant="bodySmall" style={styles.manualBadgeText}>
                      Manuell eingegeben
                    </Text>
                  </View>
                )}
                <View style={styles.distanceRow}>
                  <Icon
                    source="road-variant"
                    size={20}
                    color={theme.colors.primary}
                  />
                  <Text variant="bodyMedium" style={styles.distanceText}>
                    Entfernung: {distanceResult.distanceText}
                    {tripDirection === 'roundtrip' ? ' (× 2 = ' + (distanceResult.distanceKm * 2).toFixed(1).replace('.', ',') + ' km)' : ''}
                  </Text>
                </View>
                {!isManualDistance && distanceResult.durationText ? (
                  <View style={styles.distanceRow}>
                    <Icon
                      source="clock-outline"
                      size={20}
                      color={theme.colors.primary}
                    />
                    <Text variant="bodyMedium" style={styles.distanceText}>
                      Fahrzeit: {distanceResult.durationText}
                      {tripDirection === 'roundtrip' ? ' (× 2)' : ''}
                    </Text>
                  </View>
                ) : null}
                <View style={styles.distanceRow}>
                  <Icon
                    source="cash"
                    size={20}
                    color={theme.colors.success}
                  />
                  <Text variant="bodyMedium" style={styles.distanceTextBold}>
                    Erstattung: {parseAmount(amount).toFixed(2).replace('.', ',')} EUR
                    ({KILOMETER_RATE.toFixed(2).replace('.', ',')} EUR/km)
                  </Text>
                </View>
              </View>
            )}
          </Surface>
        )}

        {/* Amount (hidden in kilometer mode) */}
        {!isKilometerMode && (
          <Surface style={styles.section} elevation={1}>
            <Text variant="titleSmall" style={styles.sectionTitle}>
              Betrag (brutto)
            </Text>
            <TextInput
              mode="outlined"
              label="Bruttobetrag in EUR"
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              right={<TextInput.Affix text="EUR" />}
              left={<TextInput.Icon icon="cash" />}
              style={styles.input}
              outlineColor={theme.colors.border}
              activeOutlineColor={theme.colors.primary}
            />
            {grossAmount > 0 && (
              <View style={styles.vatBreakdown}>
                <View style={styles.vatBreakdownRow}>
                  <Text variant="bodySmall" style={styles.vatBreakdownLabel}>
                    Nettobetrag:
                  </Text>
                  <Text variant="bodySmall" style={styles.vatBreakdownValue}>
                    {netAmount.toFixed(2).replace('.', ',')} EUR
                  </Text>
                </View>
                <View style={styles.vatBreakdownRow}>
                  <Text variant="bodySmall" style={styles.vatBreakdownLabel}>
                    MwSt. ({getVatRateById(vatRateId).rate}%):
                  </Text>
                  <Text variant="bodySmall" style={styles.vatBreakdownValue}>
                    {vatAmount.toFixed(2).replace('.', ',')} EUR
                  </Text>
                </View>
              </View>
            )}
          </Surface>
        )}

        {/* VAT breakdown for kilometer mode */}
        {isKilometerMode && grossAmount > 0 && (
          <Surface style={styles.section} elevation={1}>
            <Text variant="titleSmall" style={styles.sectionTitle}>
              Betrag
            </Text>
            <View style={styles.vatBreakdown}>
              <View style={styles.vatBreakdownRow}>
                <Text variant="bodySmall" style={styles.vatBreakdownLabel}>
                  Bruttobetrag:
                </Text>
                <Text variant="bodySmall" style={styles.vatBreakdownValue}>
                  {grossAmount.toFixed(2).replace('.', ',')} EUR
                </Text>
              </View>
              <View style={styles.vatBreakdownRow}>
                <Text variant="bodySmall" style={styles.vatBreakdownLabel}>
                  Nettobetrag:
                </Text>
                <Text variant="bodySmall" style={styles.vatBreakdownValue}>
                  {netAmount.toFixed(2).replace('.', ',')} EUR
                </Text>
              </View>
              <View style={styles.vatBreakdownRow}>
                <Text variant="bodySmall" style={styles.vatBreakdownLabel}>
                  MwSt. ({getVatRateById(vatRateId).rate}%):
                </Text>
                <Text variant="bodySmall" style={styles.vatBreakdownValue}>
                  {vatAmount.toFixed(2).replace('.', ',')} EUR
                </Text>
              </View>
            </View>
          </Surface>
        )}

        {/* Date */}
        <Surface style={styles.section} elevation={1}>
          <Text variant="titleSmall" style={styles.sectionTitle}>
            Datum
          </Text>
          <TouchableRipple
            onPress={() => setShowDatePicker(true)}
            style={styles.dateButton}
          >
            <View style={styles.dateButtonContent}>
              <Icon
                source="calendar"
                size={20}
                color={theme.colors.primary}
              />
              <Text variant="bodyMedium" style={styles.dateText}>
                {formattedDate}
              </Text>
              <Icon
                source="chevron-down"
                size={20}
                color={theme.colors.textLight}
              />
            </View>
          </TouchableRipple>
          {showDatePicker && (
            <DateTimePicker
              value={date}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={onDateChange}
              locale="de-DE"
              maximumDate={new Date()}
            />
          )}
        </Surface>

        {/* Description */}
        <Surface style={styles.section} elevation={1}>
          <Text variant="titleSmall" style={styles.sectionTitle}>
            Beschreibung
          </Text>
          <TextInput
            mode="outlined"
            label="Beschreibung (optional)"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
            left={<TextInput.Icon icon="text" />}
            style={styles.input}
            outlineColor={theme.colors.border}
            activeOutlineColor={theme.colors.primary}
          />
        </Surface>

        {/* Receipt Photos (multiple) */}
        <Surface style={styles.section} elevation={1}>
          <Text variant="titleSmall" style={styles.sectionTitle}>
            Belege
          </Text>

          {receiptUris.length > 0 && (
            <View style={styles.receiptList}>
              {receiptUris.map((uri, index) => (
                <View key={`${uri}-${index}`} style={styles.receiptItem}>
                  <Image source={{ uri }} style={styles.receiptThumbnail} />
                  <View style={styles.receiptItemInfo}>
                    <Text
                      variant="bodySmall"
                      style={styles.receiptItemLabel}
                      numberOfLines={1}
                    >
                      Beleg {index + 1}
                    </Text>
                  </View>
                  <Button
                    mode="text"
                    compact
                    icon="close-circle"
                    onPress={() => removeReceipt(index)}
                    textColor={theme.colors.error}
                  >
                    Entfernen
                  </Button>
                </View>
              ))}
            </View>
          )}

          <Button
            mode="outlined"
            icon="camera"
            onPress={showReceiptOptions}
            style={styles.receiptButton}
            contentStyle={styles.receiptButtonContent}
            textColor={theme.colors.primary}
          >
            Beleg hinzufügen
          </Button>
        </Surface>

        {/* Save Button */}
        <Button
          mode="contained"
          onPress={handleSave}
          loading={saving}
          disabled={saving || !selectedTripId}
          style={styles.saveButton}
          contentStyle={styles.saveButtonContent}
          buttonColor={theme.colors.primary}
          textColor="#FFFFFF"
          icon="content-save"
        >
          {isEditMode ? 'Änderungen speichern' : fromTrip ? 'Position speichern' : 'Ausgabe speichern'}
        </Button>
      </ScrollView>

      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}
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
    backgroundColor: theme.colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: theme.spacing.md,
    paddingBottom: 40,
  },
  section: {
    padding: theme.spacing.md,
    borderRadius: theme.roundness,
    backgroundColor: theme.colors.surface,
    marginBottom: theme.spacing.sm + 4,
  },
  sectionTitle: {
    color: theme.colors.primary,
    fontWeight: '600',
    marginBottom: theme.spacing.sm + 4,
  },

  // Preset items
  presetList: {
    gap: theme.spacing.xs,
  },
  presetItem: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.sm + 4,
    borderRadius: theme.roundness,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  presetItemSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary + '08',
  },
  presetItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  presetItemText: {
    flex: 1,
    marginLeft: theme.spacing.sm + 4,
  },
  presetItemLabel: {
    color: theme.colors.text,
  },
  presetItemLabelSelected: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  presetItemVat: {
    color: theme.colors.textLight,
    fontSize: 11,
    marginTop: 1,
  },
  licensePlateContainer: {
    marginTop: theme.spacing.sm + 4,
    paddingTop: theme.spacing.sm + 4,
    borderTopWidth: 1,
    borderTopColor: theme.colors.divider,
  },

  // VAT header
  vatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm + 4,
  },
  vatAutoHint: {
    color: theme.colors.success,
    fontSize: 11,
    fontWeight: '500',
  },

  // Category chips
  chipRow: {
    flexDirection: 'row',
    gap: theme.spacing.xs + 2,
    paddingVertical: theme.spacing.xs,
  },
  categoryChip: {
    backgroundColor: theme.colors.surfaceVariant,
  },
  categoryChipSelected: {
    backgroundColor: theme.colors.primary,
  },
  categoryChipText: {
    color: theme.colors.text,
  },
  categoryChipTextSelected: {
    color: '#FFFFFF',
  },
  categoryHint: {
    color: theme.colors.textLight,
    marginTop: theme.spacing.sm,
    textAlign: 'center',
  },

  // VAT chips
  vatRow: {
    flexDirection: 'row',
    gap: theme.spacing.xs + 2,
    flexWrap: 'wrap',
  },
  vatChip: {
    backgroundColor: theme.colors.surfaceVariant,
  },
  vatChipSelected: {
    backgroundColor: theme.colors.primary,
  },
  vatChipText: {
    color: theme.colors.text,
  },
  vatChipTextSelected: {
    color: '#FFFFFF',
  },
  vatHint: {
    color: theme.colors.textLight,
    marginTop: theme.spacing.sm,
  },

  // VAT breakdown
  vatBreakdown: {
    marginTop: theme.spacing.sm + 4,
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.divider,
  },
  vatBreakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 2,
  },
  vatBreakdownLabel: {
    color: theme.colors.textSecondary,
  },
  vatBreakdownValue: {
    color: theme.colors.text,
    fontWeight: '500',
  },

  // Inputs
  input: {
    backgroundColor: theme.colors.surface,
  },
  spacerSm: {
    height: theme.spacing.sm,
  },
  spacerMd: {
    height: theme.spacing.md,
  },

  // Manual distance entry
  manualDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: theme.spacing.sm + 4,
  },
  manualDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: theme.colors.divider,
  },
  manualDividerText: {
    color: theme.colors.textLight,
    marginHorizontal: theme.spacing.sm + 4,
  },
  manualHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing.xs,
  },
  manualHintText: {
    color: theme.colors.warning,
    marginLeft: theme.spacing.xs,
    fontSize: 11,
  },
  manualBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
    paddingVertical: 2,
    paddingHorizontal: theme.spacing.xs,
    backgroundColor: theme.colors.warning + '15',
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  manualBadgeText: {
    color: theme.colors.warning,
    marginLeft: theme.spacing.xs,
    fontSize: 11,
    fontWeight: '600',
  },

  // Direction selection (Hin-/Rückfahrt)
  directionRow: {
    flexDirection: 'row',
    gap: theme.spacing.xs + 2,
    marginTop: theme.spacing.md,
  },
  directionChip: {
    flex: 1,
    backgroundColor: theme.colors.surfaceVariant,
  },
  directionChipSelected: {
    backgroundColor: theme.colors.primary,
  },
  directionChipText: {
    color: theme.colors.text,
    fontSize: 12,
  },
  directionChipTextSelected: {
    color: '#FFFFFF',
  },

  // Geocoding suggestions
  suggestionsContainer: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderTopWidth: 0,
    borderBottomLeftRadius: theme.roundness,
    borderBottomRightRadius: theme.roundness,
    maxHeight: 200,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.sm + 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.divider,
  },
  suggestionText: {
    flex: 1,
    marginLeft: theme.spacing.sm,
    color: theme.colors.text,
    fontSize: 12,
  },

  // Distance calculation
  calculateButton: {
    borderRadius: theme.roundness,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: theme.spacing.md,
  },
  loadingText: {
    marginLeft: theme.spacing.sm,
    color: theme.colors.textSecondary,
  },
  distanceResultContainer: {
    marginTop: theme.spacing.md,
    padding: theme.spacing.sm + 4,
    backgroundColor: theme.colors.background,
    borderRadius: theme.roundness,
    gap: theme.spacing.xs + 2,
  },
  distanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  distanceText: {
    marginLeft: theme.spacing.sm,
    color: theme.colors.text,
  },
  distanceTextBold: {
    marginLeft: theme.spacing.sm,
    color: theme.colors.success,
    fontWeight: '600',
  },

  // Date
  dateButton: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.roundness,
    padding: theme.spacing.md,
  },
  dateButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateText: {
    flex: 1,
    marginLeft: theme.spacing.sm + 4,
    color: theme.colors.text,
  },

  // Receipts (multiple)
  receiptList: {
    marginBottom: theme.spacing.sm + 4,
    gap: theme.spacing.sm,
  },
  receiptItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.xs + 2,
    backgroundColor: theme.colors.background,
    borderRadius: theme.roundness,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  receiptThumbnail: {
    width: 48,
    height: 48,
    borderRadius: 4,
    backgroundColor: theme.colors.surfaceVariant,
  },
  receiptItemInfo: {
    flex: 1,
    marginLeft: theme.spacing.sm + 4,
  },
  receiptItemLabel: {
    color: theme.colors.text,
  },
  receiptButton: {
    borderColor: theme.colors.primary,
    borderStyle: 'dashed',
  },
  receiptButtonContent: {
    paddingVertical: theme.spacing.sm,
  },

  // Trip selection
  tripSelection: {
    gap: theme.spacing.xs,
  },
  tripOption: {
    padding: theme.spacing.sm + 4,
    borderRadius: theme.roundness,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  tripOptionSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary + '08',
  },
  tripOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tripOptionLabel: {
    marginLeft: theme.spacing.sm,
    color: theme.colors.text,
  },
  tripOptionLabelSelected: {
    color: theme.colors.primary,
    fontWeight: '500',
  },
  noTripsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.sm,
  },
  noTripsText: {
    flex: 1,
    marginLeft: theme.spacing.sm,
    color: theme.colors.textSecondary,
  },
  tripFixedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.xs,
  },
  tripFixedLabel: {
    marginLeft: theme.spacing.sm,
    color: theme.colors.primary,
    fontWeight: '600',
  },

  // Save button
  saveButton: {
    marginTop: theme.spacing.sm,
    borderRadius: theme.roundness,
  },
  saveButtonContent: {
    paddingVertical: theme.spacing.sm,
  },
});

export default NewExpenseScreen;
