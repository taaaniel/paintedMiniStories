import React from 'react';
import { Text, TextInput, TextInputProps, View } from 'react-native';
import InputFiledBg from '../../assets/images/InputField.svg'; // SVG background
import { styles } from './CustomInput.styles';

const INPUT_HEIGHT = 56; // increased & unified height

interface CustomInputProps extends Omit<TextInputProps, 'onChange'> {
  label?: string;
  value: string;
  onChangeText: (t: string) => void;
  required?: boolean;
  error?: string;
}

export default function CustomInput({
  label,
  value,
  onChangeText,
  required,
  error,
  style,
  ...rest
}: CustomInputProps) {
  const [containerWidth, setContainerWidth] = React.useState<
    number | undefined
  >();
  return (
    <View style={styles.wrap}>
      {label && (
        <View style={styles.labelRow}>
          <Text style={styles.label}>{label}</Text>
          {required ? <Text style={styles.required}>*</Text> : null}
        </View>
      )}
      <View
        style={styles.bgContainer}
        onLayout={({ nativeEvent }) => {
          if (!containerWidth) setContainerWidth(nativeEvent.layout.width);
        }}
      >
        <InputFiledBg
          width={containerWidth || '100%'}
          // @ts-ignore
          height={INPUT_HEIGHT}
          preserveAspectRatio="none"
          style={{ position: 'absolute', top: 0, left: 0, right: 0 }}
          pointerEvents="none"
        />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholderTextColor="#666"
          style={[
            styles.input,
            {
              height: INPUT_HEIGHT,
              paddingVertical: 12,
              textAlignVertical: 'center',
            },
            style,
          ]}
          {...rest}
        />
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}
