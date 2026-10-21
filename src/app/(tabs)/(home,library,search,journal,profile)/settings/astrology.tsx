import { t as tr } from '../../../../i18n';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { getOnboarding, setOnboarding } from '../../../../familiar';
import { HOUSES } from '../../../../astrology';
import { c } from '../../../../theme';
import { Page, ss } from '../../../../components/settings-ui';

const ABOUT: Record<string, string> = {
  placidus: 'The most used in Western books. Houses follow the time it takes each degree to rise; sizes vary.',
  whole: 'The oldest system. Each house is one whole sign, starting with the rising sign.',
  equal: 'Twelve houses of 30 degrees each, starting at the Ascendant degree.',
};

export default function AstrologySettings() {
  const [sys, setSys] = useState(getOnboarding().houses ?? 'placidus');
  return (
    <Page>
      <Text style={ss.label}>{tr("House system")}</Text>
      <View style={[ss.card, { marginTop: 6 }]}>
        {HOUSES.map((h) => (
          <Pressable key={h.id} onPress={() => (setOnboarding({ houses: h.id }), setSys(h.id))} style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
            <Ionicons name={sys === h.id ? 'radio-button-on' : 'radio-button-off'} size={20} color={c.gold} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: c.text, fontSize: 16 }}>{h.name}</Text>
              <Text style={ss.meta}>{ABOUT[h.id]}</Text>
            </View>
          </Pressable>
        ))}
      </View>
      <Text style={ss.meta}>{tr("Needs your birth time and place. Tropical zodiac.")}</Text>
    </Page>
  );
}
