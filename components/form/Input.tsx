import React, { useState } from 'react';
import {
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextStyle,
  View,
} from 'react-native';

interface InputProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  required?: boolean;
  error?: string;
  onBlur?: (e: any) => void;
  style?: StyleProp<TextStyle>;
}

const Input: React.FC<InputProps> = ({
  label,
  required = false,
  style,
  onBlur,
  value,
  ...rest
}) => {
  const [touched, setTouched] = useState(false);

  const handleBlur = (e: any) => {
    setTouched(true);
    if (onBlur) onBlur(e);
  };

  const showRequired = required && touched && (!value || value === '');

  return (
    <View style={styles.wrap}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TextInput
        style={[styles.input, style]}
        placeholderTextColor="#888"
        onBlur={handleBlur}
        value={value}
        {...rest}
      />
      {showRequired && (
        <Text style={styles.required}>This field is required</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { marginBottom: 16 },
  label: {
    fontFamily: 'Anton',
    fontSize: 18,
    marginBottom: 4,
    color: '#444',
  },
  required: {
    color: '#C00',
    fontSize: 12,
    fontFamily: 'Anton',
    marginTop: 4,
    marginLeft: 2,
  },
  input: {
    fontFamily: 'Anton',
    fontSize: 20,
    borderWidth: 2,
    borderColor: '#222',
    borderRadius: 4,
    padding: 10,
    backgroundColor: '#fff',
    color: '#222',
  },
});

export default Input;
