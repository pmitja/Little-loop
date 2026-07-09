import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import { SectionLabel, Txt } from '@/components';
import { colors, fonts, radii } from '@/theme/tokens';

interface FieldProps extends TextInputProps {
  label: string;
  error?: string | null;
}

export function Field({ label, error, ...inputProps }: FieldProps) {
  return (
    <View style={{ gap: 8 }}>
      <SectionLabel>{label}</SectionLabel>
      <TextInput
        placeholderTextColor={colors.subtle}
        style={[styles.input, error ? { borderColor: colors.red } : null]}
        {...inputProps}
      />
      {error ? (
        <Txt weight="bold" size={12.5} color={colors.red}>
          {error}
        </Txt>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radii.input,
    paddingVertical: 15,
    paddingHorizontal: 18,
    fontFamily: fonts.bold,
    fontSize: 16,
    color: colors.ink,
  },
});
