import React from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from 'react-native';
import TextAreaFieldBg from '../../assets/images/TextAreaFieldBg.svg';
import { styles } from './CustomTextarea.styles';

interface CustomTextareaProps
  extends Omit<TextInputProps, 'onChange' | 'value'> {
  label?: string;
  value: string;
  onChangeText: (t: string) => void;
  required?: boolean;
  error?: string;
  maxLength?: number;
  showCounter?: boolean;
}

export default function CustomTextarea({
  label,
  value,
  onChangeText,
  required,
  error,
  style,
  maxLength,
  showCounter = true,
  placeholder,
  ...rest
}: CustomTextareaProps) {
  const counterLimit = maxLength ?? 320; // fallback to 320
  return (
    <View style={styles.wrap}>
      {label && (
        <View style={styles.labelRow}>
          <Text style={styles.label}>{label}</Text>
          {required ? <Text style={styles.required}>*</Text> : null}
        </View>
      )}
      <View style={styles.textareaWrap}>
        <TextAreaFieldBg
          width="100%"
          height="100%"
          style={StyleSheet.absoluteFill}
          preserveAspectRatio="none"
        />
        <TextInput
          multiline
          value={value}
          onChangeText={onChangeText}
          style={styles.textareaInput}
          placeholder={placeholder}
          placeholderTextColor="#666"
          maxLength={320}
          {...rest}
        />
      </View>
      <View style={styles.footerRow}>
        {error ? <Text style={styles.errorText}>{error}</Text> : <View />}
        {showCounter ? (
          <Text style={styles.counter}>
            {value.length} / {counterLimit}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
