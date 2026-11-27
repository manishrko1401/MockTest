import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useTheme } from './theme';
import { applyNumericKey } from './shared/examScoring';

// -----------------------------------------------------------------------------
// Answer box + keypad for numerical-answer questions (JEE Section B), the same as the
// website's: the answer is typed with the keys only (1-9, ".", 0, +/-, CE, DEL) and saved
// with Save & Next like an option. Shown under the question instead of options.
// -----------------------------------------------------------------------------

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '+/-', 'CE', 'DEL'];
const KEY_BG = '#20b8d6';

export default function NumericAnswerPad({ value, onChange, hi, disabled }: {
  value: string; onChange: (v: string) => void; hi: boolean; disabled?: boolean;
}) {
  const t = useTheme();
  return (
    <View style={{ paddingHorizontal: 14, paddingTop: 10, paddingBottom: 4, backgroundColor: t.card, borderTopWidth: 1, borderTopColor: t.border }}>
      <View style={{ minHeight: 46, borderRadius: 8, backgroundColor: t.cardAlt, borderWidth: 1, borderColor: t.border, paddingHorizontal: 14, justifyContent: 'center', marginBottom: 8 }}
        accessibilityLabel={hi ? 'आपका उत्तर' : 'Your answer'}>
        {value
          ? <Text style={{ color: t.text, fontSize: 18, fontWeight: '800', letterSpacing: 0.5 }}>{value}</Text>
          : <Text style={{ color: t.textSoft, fontSize: 15 }}>{hi ? 'अपना उत्तर दर्ज करें' : 'Enter your answer'}</Text>}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {KEYS.map(k => (
          <Pressable
            key={k}
            disabled={disabled}
            onPress={() => onChange(applyNumericKey(value, k))}
            style={({ pressed }) => ({ width: '32%', height: 40, borderRadius: 7, alignItems: 'center', justifyContent: 'center', backgroundColor: KEY_BG, opacity: disabled ? 0.5 : pressed ? 0.75 : 1 })}
            accessibilityLabel={k === 'DEL' ? (hi ? 'अंतिम अंक मिटाएं' : 'Delete last digit') : k === 'CE' ? (hi ? 'उत्तर साफ़ करें' : 'Clear answer') : k === '+/-' ? (hi ? 'चिह्न बदलें' : 'Change sign') : k}
          >
            <Text style={{ color: '#fff', fontSize: 17, fontWeight: '700' }}>{k}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
