import React, { useEffect, useState } from 'react';
import { Modal, ScrollView, Text, View } from 'react-native';
import { CheckCircle2, Crown, Gift } from 'lucide-react-native';
import { request, friendlyError } from '../api';
import { useI18n } from '../i18n';
import { useSession, useUser } from '../session';
import { useTheme } from '../theme';
import { Button, ErrorBox } from '../ui';

// -----------------------------------------------------------------------------
// Launch offer: every student gets a free 1-year Pass Pro. Same as the website's home page:
// shown shortly after the app opens until the student claims it; closing it hides it until
// the app is opened again. Once claimed (Pass Pro on the account) it never shows.
// -----------------------------------------------------------------------------

const PRO = 'Testbook Pass Pro';
let closedThisRun = false; // "Close" hides it until the app is started again

export function PassGift() {
  const t = useTheme();
  const { hi } = useI18n();
  const user = useUser();
  const { refreshUser } = useSession();
  const hasPro = user.subscriptionTier === PRO;
  const [open, setOpen] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // A moment after the app opens (the home screen draws first)
  useEffect(() => {
    if (hasPro || closedThisRun) return;
    const timer = setTimeout(() => setOpen(true), 1500);
    return () => clearTimeout(timer);
  }, [hasPro, user.id]);

  const close = () => { closedThisRun = true; setOpen(false); };
  const claim = async () => {
    setBusy(true); setError('');
    try {
      await request('claim-pass-pro', { userId: user.id, tier: PRO });
      await refreshUser();
      setClaimed(true);
    } catch (e) { setError(friendlyError(e)); }
    finally { setBusy(false); }
  };

  if (!open || (hasPro && !claimed)) return null;
  const end = user.subscriptionExpiresAt ? new Date(user.subscriptionExpiresAt) : null;
  const until = end && !Number.isNaN(end.getTime()) ? end.toLocaleDateString(hi ? 'hi-IN' : 'en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : user.subscriptionExpiresAt || '';
  const perks = hi
    ? [['सभी PRO मॉक टेस्ट', 'एसएससी, बैंकिंग, रेलवे और राज्य स्तरीय सभी प्रीमियम टेस्ट।'], ['RRB NTPC CBAT (साइको टेस्ट)', 'सभी बैटरी, असली परीक्षा जैसी।'], ['पूरा विश्लेषण', 'विस्तृत हल, सेक्शन-वार समय और टॉपर से तुलना।']]
    : [['All PRO mock tests', 'Every SSC, Banking, Railways and State level premium test.'], ['RRB NTPC CBAT (psycho test)', 'Every battery, just like the real exam.'], ['Full analysis', 'Detailed solutions, section-wise time and topper comparison.']];

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={close}>
      <View style={{ flex: 1, backgroundColor: t.overlay, justifyContent: 'center', padding: 20 }}>
        <View style={{ backgroundColor: t.card, borderRadius: 20, maxHeight: '92%', overflow: 'hidden' }}>
          <ScrollView contentContainerStyle={{ padding: 22, alignItems: 'center' }}>
            {claimed ? (
              <>
                <CheckCircle2 size={56} color={t.success} />
                <Text style={{ color: t.text, fontSize: 21, fontWeight: '900', marginTop: 12, textAlign: 'center' }}>{hi ? 'पास प्रो सक्रिय हो गया!' : 'Pass Pro is active!'}</Text>
                <Text style={{ color: t.textSoft, marginTop: 8, textAlign: 'center', lineHeight: 21 }}>
                  {until
                    ? (hi ? `${until} तक सभी प्रीमियम टेस्ट आपके लिए खुले हैं।` : `All premium tests are open for you until ${until}.`)
                    : (hi ? 'सभी प्रीमियम टेस्ट आपके लिए खुले हैं।' : 'All premium tests are open for you.')}
                </Text>
                <Button style={{ marginTop: 20, alignSelf: 'stretch' }} title={hi ? 'टेस्ट शुरू करें' : 'Start practising'} onPress={close} />
              </>
            ) : (
              <>
                <View style={{ width: 72, height: 72, borderRadius: 18, backgroundColor: t.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
                  <Gift size={36} color={t.primary} />
                </View>
                <Text style={{ color: t.text, fontSize: 22, fontWeight: '900', marginTop: 14 }}>{hi ? 'बधाई हो!' : 'Congratulations!'}</Text>
                <Text style={{ color: t.primary, fontWeight: '800', marginTop: 4 }}>{hi ? 'मॉक टेस्ट हब टीम से उपहार' : 'Gift from Mock Test Hub Team'}</Text>
                <Text style={{ color: t.textSoft, marginTop: 10, textAlign: 'center', lineHeight: 21 }}>
                  {hi ? 'आपके लिए 1 वर्ष का मॉक टेस्ट पास प्रो बिल्कुल मुफ़्त। अभी क्लेम करें और सभी प्रीमियम टेस्ट दें।' : 'A free 1-year Mock Test Pass Pro is waiting for you. Claim it now and take every premium test.'}
                </Text>
                <View style={{ alignSelf: 'stretch', marginTop: 16, backgroundColor: t.cardAlt, borderRadius: 14, padding: 14, gap: 12 }}>
                  {perks.map(([title, sub]) => (
                    <View key={title} style={{ flexDirection: 'row', gap: 10 }}>
                      <Crown size={18} color={t.warning} style={{ marginTop: 1 }} />
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: t.text, fontWeight: '800' }}>{title}</Text>
                        <Text style={{ color: t.textMuted, fontSize: 12.5, marginTop: 1, lineHeight: 18 }}>{sub}</Text>
                      </View>
                    </View>
                  ))}
                </View>
                {error ? <View style={{ alignSelf: 'stretch', marginTop: 10 }}><ErrorBox message={error} /></View> : null}
                <Button style={{ marginTop: 18, alignSelf: 'stretch' }} title={hi ? '1 वर्ष का पास प्रो क्लेम करें' : 'Claim 1 Year Pass Pro'}
                  icon={<Gift size={18} color={t.primaryText} />} loading={busy} onPress={claim} />
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
