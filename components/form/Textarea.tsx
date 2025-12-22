import React from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from 'react-native';

type Props = TextInputProps & {
  label?: string;
  maxLength?: number;
  value: string;
};

const Textarea: React.FC<Props> = ({
  label,
  style,
  maxLength = 1000,
  value,
  ...rest
}) => (
  <View style={styles.wrap}>
    {label && <Text style={styles.label}>{label}</Text>}
    <TextInput
      style={[styles.input, style]}
      placeholderTextColor="#888"
      multiline
      maxLength={maxLength}
      value={value}
      {...rest}
    />
    <Text style={styles.counter}>{`${value.length}/${maxLength}`}</Text>
  </View>
);

const styles = StyleSheet.create({
  wrap: { marginBottom: 16 },
  label: {
    fontFamily: 'Anton',
    fontSize: 18,
    marginBottom: 4,
    color: '#444',
  },
  input: {
    fontFamily: 'Anton',
    fontSize: 18,
    borderWidth: 2,
    borderColor: '#222',
    borderRadius: 4,
    padding: 10,
    backgroundColor: '#fff',
    color: '#222',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  counter: {
    alignSelf: 'flex-end',
    fontSize: 12,
    color: '#888',
    marginTop: 2,
    fontFamily: 'Anton',
  },
});

export default Textarea;
