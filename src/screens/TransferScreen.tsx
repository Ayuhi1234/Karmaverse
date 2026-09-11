import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, StatusBar, KeyboardAvoidingView, Platform, ActivityIndicator, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Phone, Coins, CheckCircle2, Info, Recycle, Gift, ArrowDown } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { KarmaCoin } from '../components/shared/KarmaCoin';
import { transferService, CoinType, TransferQuote } from '../services/transfer';
import { profileService } from '../services/profile';
import { showAlert } from '../utils/alert';
import { formatRupees } from '../utils/streakTiers';

const PHONE_REGEX = /^[6-9]\d{9}$/;
const QUICK_AMOUNTS = [100, 500, 1000];

type FieldErrors = { phone?: string; amount?: string; general?: string };

// Map a backend error to the field it belongs on. Messages are matched loosely
// so a small backend wording change doesn't silently drop the inline error.
function mapTransferError(error: any, coinLabel: string): FieldErrors | 'unauthorized' {
  const status = error?.response?.status;
  const msg: string = error?.response?.data?.message || '';
  if (status === 401) return 'unauthorized';
  const m = msg.toLowerCase();
  if (status === 404 || m.includes('not registered')) {
    return { phone: "We couldn't find a KarmaCoin user with this number" };
  }
  if (m.includes('yourself')) return { phone: "You can't send coins to your own number" };
  if (m.includes('not active')) return { general: "This user's account isn't active right now" };
  if (m.includes('10-digit') || m.includes('valid')) return { phone: 'Enter a valid 10-digit mobile number' };
  if (m.includes('at least 1')) return { amount: 'Enter an amount of at least 1' };
  if (m.includes('insufficient')) return { amount: `You don't have enough ${coinLabel} coins for this` };
  if (m.includes('too small')) return { amount: 'Amount is too small — try a larger amount' };
  return { general: msg || 'Something went wrong. Please try again.' };
}

export function TransferScreen({ navigation, route }: any) {
  const [pickupCoins, setPickupCoins] = useState<number>(route?.params?.pickupCoins ?? 0);
  const [rewardCoins, setRewardCoins] = useState<number>(route?.params?.rewardCoins ?? 0);

  const [phone, setPhone] = useState('');
  const [coinType, setCoinType] = useState<CoinType>('REWARD');
  const [amountInput, setAmountInput] = useState('');

  const [quote, setQuote] = useState<TransferQuote | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});

  const [confirmVisible, setConfirmVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [receipt, setReceipt] = useState<TransferQuote | null>(null);

  const amount = parseInt(amountInput, 10) || 0;
  const isReward = coinType === 'REWARD';
  const coinLabel = isReward ? 'reward' : 'pickup';
  const balance = isReward ? rewardCoins : pickupCoins;
  const phoneValid = PHONE_REGEX.test(phone);

  // Keep balances fresh — the wallet passes them in, but the user may have
  // earned/spent since. Balance is only used for local pre-checks; the backend
  // is the source of truth on submit.
  useEffect(() => {
    profileService.getProfile()
      .then((p) => {
        setPickupCoins(p.pickupCoins ?? 0);
        setRewardCoins(p.rewardCoins ?? p.coins ?? 0);
      })
      .catch(() => {});
  }, []);

  // Local, instant validation before we ever hit the network.
  const localAmountError = useMemo(() => {
    if (!amountInput) return undefined;
    if (amount < 1) return 'Enter an amount of at least 1';
    if (amount > balance) return `You don't have enough ${coinLabel} coins for this`;
    return undefined;
  }, [amountInput, amount, balance, coinLabel]);

  // Debounced quote: fires once phone + amount are valid, re-priced whenever any
  // input changes. Any in-flight quote for stale input is ignored.
  const reqIdRef = useRef(0);
  useEffect(() => {
    setQuote(null);
    if (!phoneValid || amount < 1 || localAmountError) {
      setQuoting(false);
      return;
    }
    const id = ++reqIdRef.current;
    setQuoting(true);
    const t = setTimeout(async () => {
      try {
        const q = await transferService.quote({ recipientPhone: phone, coinType, amount });
        if (id !== reqIdRef.current) return;
        setQuote(q);
        setErrors({});
      } catch (error: any) {
        if (id !== reqIdRef.current) return;
        const mapped = mapTransferError(error, coinLabel);
        if (mapped === 'unauthorized') { navigation.replace('Login'); return; }
        setErrors(mapped);
        setQuote(null);
      } finally {
        if (id === reqIdRef.current) setQuoting(false);
      }
    }, 500);
    return () => clearTimeout(t);
  }, [phone, coinType, amount, phoneValid, localAmountError]);

  const phoneError = errors.phone;
  const amountError = localAmountError || errors.amount;

  const canReview = phoneValid && amount >= 1 && !localAmountError && !!quote && !quoting;

  const handleConfirm = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      // Re-price at the moment of sending — the recipient's tier may have moved
      // since the preview quote, so the receipt reflects what actually happened.
      const result = await transferService.transfer({ recipientPhone: phone, coinType, amount });
      // Reflect the debit locally so a quick trip back to the wallet looks right.
      if (isReward) setRewardCoins((c) => c - result.sent.coins);
      else setPickupCoins((c) => c - result.sent.coins);
      setReceipt(result);
      setConfirmVisible(false);
    } catch (error: any) {
      const mapped = mapTransferError(error, coinLabel);
      setConfirmVisible(false);
      if (mapped === 'unauthorized') { navigation.replace('Login'); return; }
      setErrors(mapped);
      showAlert('Transfer failed', mapped.general || mapped.phone || mapped.amount || 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // ---------- Receipt ----------
  if (receipt) {
    const sameCount = receipt.sent.coins === receipt.received.coins;
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#064e3b" />
        <View style={styles.successScreen}>
          <View style={styles.successIconBg}>
            <CheckCircle2 size={48} color="#16a34a" />
          </View>
          <Text style={styles.successTitle}>Coins sent!</Text>
          <Text style={styles.successSub}>
            {receipt.received.coins.toLocaleString()} {coinLabel} coins are now in {receipt.recipient.name}'s wallet.
          </Text>
          <View style={styles.receiptCard}>
            <View style={styles.receiptRow}>
              <Text style={styles.receiptLabel}>You sent</Text>
              <Text style={styles.receiptValue}>{receipt.sent.coins.toLocaleString()} coins</Text>
            </View>
            <View style={styles.receiptRow}>
              <Text style={styles.receiptLabel}>{receipt.recipient.name} received</Text>
              <Text style={styles.receiptValue}>{receipt.received.coins.toLocaleString()} coins</Text>
            </View>
            {!sameCount && (
              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Value transferred</Text>
                <Text style={[styles.receiptValue, { color: '#16a34a' }]}>{formatRupees(receipt.received.value)}</Text>
              </View>
            )}
          </View>
          <TouchableOpacity
            style={styles.primaryActionBtn}
            onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('App')}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryActionText}>Back to wallet</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ---------- Form ----------
  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar barStyle="light-content" backgroundColor="#064e3b" />
      <View style={styles.topNotchFiller} />

      <LinearGradient colors={['#064e3b', '#15803d']} style={styles.header}>
        <SafeAreaView>
          <View style={styles.headerRow}>
            <TouchableOpacity style={styles.backBtnInner} onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('App')}>
              <ChevronLeft size={22} color="white" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Send coins</Text>
            <View style={{ width: 36 }} />
          </View>
          <View style={styles.balancePill}>
            <KarmaCoin size={22} />
            <Text style={styles.balanceText}>{balance.toLocaleString()} {coinLabel} coins available</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.formContainer}>
          {/* Recipient phone */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Recipient's mobile number</Text>
            <View style={[styles.inputWrapper, phoneError && styles.inputWrapperError]}>
              <Phone size={18} color="#94a3b8" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={(t) => setPhone(t.replace(/[^0-9]/g, '').slice(0, 10))}
                keyboardType="number-pad"
                placeholder="10-digit KarmaCoin user number"
                placeholderTextColor="#94a3b8"
                maxLength={10}
              />
            </View>
            {phoneError ? <Text style={styles.errorText}>{phoneError}</Text> : null}
          </View>

          {/* Coin type toggle */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Which coins to send</Text>
            <View style={styles.toggleRow}>
              <TouchableOpacity
                style={[styles.toggleBtn, !isReward && styles.toggleBtnActive]}
                onPress={() => setCoinType('PICKUP')}
                activeOpacity={0.85}
              >
                <Recycle size={16} color={!isReward ? '#15803d' : '#94a3b8'} />
                <Text style={[styles.toggleText, !isReward && styles.toggleTextActive]}>Pickup</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toggleBtn, isReward && styles.toggleBtnActive]}
                onPress={() => setCoinType('REWARD')}
                activeOpacity={0.85}
              >
                <Gift size={16} color={isReward ? '#15803d' : '#94a3b8'} />
                <Text style={[styles.toggleText, isReward && styles.toggleTextActive]}>Reward</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Amount */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Amount to send</Text>
            <View style={[styles.inputWrapper, amountError && styles.inputWrapperError]}>
              <Coins size={18} color="#94a3b8" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={amountInput}
                onChangeText={(t) => setAmountInput(t.replace(/[^0-9]/g, ''))}
                keyboardType="number-pad"
                placeholder="e.g. 500"
                placeholderTextColor="#94a3b8"
              />
            </View>
            <View style={styles.quickRow}>
              {QUICK_AMOUNTS.map((amt) => (
                <TouchableOpacity
                  key={amt}
                  style={[styles.quickChip, amount === amt && styles.quickChipActive]}
                  onPress={() => setAmountInput(String(amt))}
                  disabled={amt > balance}
                >
                  <Text style={[styles.quickChipText, amount === amt && styles.quickChipTextActive]}>{amt}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={[styles.quickChip, amount === balance && styles.quickChipActive]}
                onPress={() => setAmountInput(String(balance))}
                disabled={balance < 1}
              >
                <Text style={[styles.quickChipText, amount === balance && styles.quickChipTextActive]}>Max</Text>
              </TouchableOpacity>
            </View>
            {amountError ? <Text style={styles.errorText}>{amountError}</Text> : null}
          </View>

          {errors.general ? (
            <View style={styles.generalError}>
              <Text style={styles.generalErrorText}>{errors.general}</Text>
            </View>
          ) : null}

          {/* Live quote preview */}
          {quoting && (
            <View style={styles.quoteLoading}>
              <ActivityIndicator size="small" color="#16a34a" />
              <Text style={styles.quoteLoadingText}>Checking recipient…</Text>
            </View>
          )}

          {quote && !quoting && (
            <View style={styles.quoteCard}>
              <View style={styles.quoteHeadRow}>
                <Text style={styles.quoteRecipient}>{quote.recipient.name}</Text>
                <Text style={styles.quoteRecipientPhone}>{quote.recipient.phone}</Text>
              </View>
              <View style={styles.quoteBody}>
                <View style={styles.quoteSide}>
                  <Text style={styles.quoteSideLabel}>You send</Text>
                  <Text style={styles.quoteSideCoins}>{quote.sent.coins.toLocaleString()}</Text>
                  {isReward && <Text style={styles.quoteSideValue}>{formatRupees(quote.sent.value)}</Text>}
                </View>
                <ArrowDown size={18} color="#94a3b8" />
                <View style={styles.quoteSide}>
                  <Text style={styles.quoteSideLabel}>They receive</Text>
                  <Text style={[styles.quoteSideCoins, { color: '#15803d' }]}>{quote.received.coins.toLocaleString()}</Text>
                  {isReward && <Text style={styles.quoteSideValue}>{formatRupees(quote.received.value)}</Text>}
                </View>
              </View>
              {isReward && quote.sent.coins !== quote.received.coins && (
                <View style={styles.infoNote}>
                  <Info size={13} color="#0369a1" />
                  <Text style={styles.infoNoteText}>
                    Reward coins convert by value, at each person's own tier rate. The value stays the same.
                  </Text>
                </View>
              )}
            </View>
          )}

          <TouchableOpacity
            style={[styles.primaryActionBtn, !canReview && styles.primaryActionBtnDisabled]}
            onPress={() => setConfirmVisible(true)}
            disabled={!canReview}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryActionText}>Review transfer</Text>
          </TouchableOpacity>
          <Text style={styles.securityNote}>
            Coins can only be sent to registered KarmaCoin users. Pickup coins move 1:1; reward coins convert by value.
          </Text>
        </View>
      </ScrollView>

      {/* Confirm sheet */}
      <Modal visible={confirmVisible} transparent animationType="fade" onRequestClose={() => setConfirmVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => !submitting && setConfirmVisible(false)}>
          <TouchableOpacity style={styles.sheet} activeOpacity={1}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Confirm transfer</Text>

            {quote && (
              <View style={styles.confirmBlock}>
                <View style={styles.confirmRow}>
                  <View>
                    <Text style={styles.confirmLabel}>You send</Text>
                    <Text style={styles.confirmSub}>{quote.sent.coins.toLocaleString()} {coinLabel} coins</Text>
                  </View>
                  {isReward
                    ? <Text style={styles.confirmAmount}>{formatRupees(quote.sent.value)}</Text>
                    : <Text style={styles.confirmAmount}>{quote.sent.coins.toLocaleString()}</Text>}
                </View>
                <View style={styles.confirmDivider} />
                <View style={styles.confirmRow}>
                  <View>
                    <Text style={styles.confirmLabel}>{quote.recipient.name} receives</Text>
                    <Text style={styles.confirmSub}>{quote.received.coins.toLocaleString()} {coinLabel} coins</Text>
                  </View>
                  {isReward
                    ? <Text style={[styles.confirmAmount, { color: '#16a34a' }]}>{formatRupees(quote.received.value)}</Text>
                    : <Text style={[styles.confirmAmount, { color: '#16a34a' }]}>{quote.received.coins.toLocaleString()}</Text>}
                </View>
                {isReward && (
                  <View style={styles.infoNote}>
                    <Info size={13} color="#0369a1" />
                    <Text style={styles.infoNoteText}>Reward coins convert by value, at each person's own tier rate.</Text>
                  </View>
                )}
              </View>
            )}

            <TouchableOpacity
              style={[styles.primaryActionBtn, { marginTop: 18, width: '100%' }, submitting && styles.primaryActionBtnDisabled]}
              onPress={handleConfirm}
              disabled={submitting}
              activeOpacity={0.8}
            >
              {submitting ? <ActivityIndicator color="white" /> : <Text style={styles.primaryActionText}>Confirm and send</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryActionBtn} onPress={() => !submitting && setConfirmVisible(false)} disabled={submitting}>
              <Text style={styles.secondaryActionText}>Go back</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f4f5' },
  topNotchFiller: { position: 'absolute', top: 0, left: 0, right: 0, height: 60, backgroundColor: '#064e3b' },
  scroll: { flex: 1 },

  header: { paddingBottom: 20 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 10, maxWidth: 800, width: '100%', alignSelf: 'center' },
  backBtnInner: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '900', color: 'white', textAlign: 'center' },
  balancePill: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'center', backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 100, paddingHorizontal: 16, paddingVertical: 8, marginTop: 16 },
  balanceText: { color: 'white', fontWeight: '800', fontSize: 13 },

  formContainer: { padding: 20, maxWidth: 800, width: '100%', alignSelf: 'center' },
  inputGroup: { marginBottom: 16 },
  inputLabel: { fontSize: 13, fontWeight: '700', color: '#475569', marginBottom: 6, marginLeft: 4 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 16, paddingHorizontal: 16, height: 56 },
  inputWrapperError: { borderColor: '#fca5a5', backgroundColor: '#fef2f2' },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, fontSize: 16, color: '#0f172a', fontWeight: '600', height: '100%' },
  errorText: { fontSize: 12, color: '#dc2626', fontWeight: '600', marginTop: 8, marginLeft: 4 },

  toggleRow: { flexDirection: 'row', gap: 10 },
  toggleBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 50, borderRadius: 14, borderWidth: 1.5, borderColor: '#e2e8f0', backgroundColor: 'white' },
  toggleBtnActive: { borderColor: '#15803d', backgroundColor: '#f0fdf4' },
  toggleText: { fontSize: 14, fontWeight: '800', color: '#64748b' },
  toggleTextActive: { color: '#15803d' },

  quickRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  quickChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 100, borderWidth: 1.5, borderColor: '#e2e8f0', backgroundColor: 'white' },
  quickChipActive: { borderColor: '#15803d', backgroundColor: '#f0fdf4' },
  quickChipText: { fontSize: 13, fontWeight: '700', color: '#64748b' },
  quickChipTextActive: { color: '#15803d' },

  generalError: { backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca', borderRadius: 14, padding: 14, marginBottom: 16 },
  generalErrorText: { fontSize: 13, color: '#b91c1c', fontWeight: '700' },

  quoteLoading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 18 },
  quoteLoadingText: { color: '#64748b', fontWeight: '600', fontSize: 13 },

  quoteCard: { backgroundColor: 'white', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 20, padding: 18, marginBottom: 18 },
  quoteHeadRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  quoteRecipient: { fontSize: 16, fontWeight: '900', color: '#0f172a' },
  quoteRecipientPhone: { fontSize: 12, fontWeight: '600', color: '#94a3b8' },
  quoteBody: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  quoteSide: { alignItems: 'center', flex: 1 },
  quoteSideLabel: { fontSize: 11, fontWeight: '700', color: '#94a3b8', marginBottom: 4 },
  quoteSideCoins: { fontSize: 24, fontWeight: '900', color: '#0f172a', letterSpacing: -0.5 },
  quoteSideValue: { fontSize: 12, fontWeight: '700', color: '#64748b', marginTop: 2 },

  infoNote: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, backgroundColor: '#f0f9ff', borderRadius: 12, padding: 10, marginTop: 14 },
  infoNoteText: { flex: 1, fontSize: 11.5, color: '#0c4a6e', fontWeight: '600', lineHeight: 16 },

  primaryActionBtn: { backgroundColor: '#15803d', paddingVertical: 15, paddingHorizontal: 44, borderRadius: 16, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', minWidth: 240, marginTop: 10, shadowColor: '#16a34a', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 5 },
  primaryActionBtnDisabled: { backgroundColor: '#94a3b8', shadowOpacity: 0, elevation: 0 },
  primaryActionText: { color: 'white', fontSize: 16, fontWeight: '900' },
  securityNote: { textAlign: 'center', color: '#94a3b8', fontSize: 11, fontWeight: '500', marginTop: 12, paddingHorizontal: 8 },
  secondaryActionBtn: { marginTop: 14, alignItems: 'center' },
  secondaryActionText: { color: '#64748b', fontWeight: '700', fontSize: 13 },

  // Confirm sheet
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.55)', justifyContent: Platform.OS === 'web' ? 'center' : 'flex-end', alignItems: 'center', padding: Platform.OS === 'web' ? 20 : 0 },
  sheet: { backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24, borderBottomLeftRadius: Platform.OS === 'web' ? 24 : 0, borderBottomRightRadius: Platform.OS === 'web' ? 24 : 0, padding: 22, paddingBottom: Platform.OS === 'web' ? 22 : 34, maxWidth: 560, width: '100%', alignSelf: 'center' },
  sheetHandle: { width: 44, height: 5, borderRadius: 3, backgroundColor: '#e2e8f0', alignSelf: 'center', marginBottom: 16 },
  sheetTitle: { fontSize: 18, fontWeight: '900', color: '#0f172a', marginBottom: 10 },
  confirmBlock: { marginTop: 6 },
  confirmRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  confirmLabel: { fontSize: 14, fontWeight: '800', color: '#0f172a' },
  confirmSub: { fontSize: 12, fontWeight: '600', color: '#94a3b8', marginTop: 2 },
  confirmAmount: { fontSize: 22, fontWeight: '900', color: '#0f172a', letterSpacing: -0.5 },
  confirmDivider: { height: 1, backgroundColor: '#f1f5f9' },

  successScreen: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30 },
  successIconBg: { width: 96, height: 96, borderRadius: 48, backgroundColor: '#f0fdf4', alignItems: 'center', justifyContent: 'center', marginBottom: 20, borderWidth: 1.5, borderColor: '#bbf7d0' },
  successTitle: { fontSize: 24, fontWeight: '900', color: '#0f172a', marginBottom: 10 },
  successSub: { fontSize: 14, color: '#64748b', textAlign: 'center', fontWeight: '500', lineHeight: 20, marginBottom: 20 },
  receiptCard: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 16, padding: 16, width: '100%', maxWidth: 420, marginBottom: 24 },
  receiptRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  receiptLabel: { fontSize: 13, color: '#64748b', fontWeight: '600' },
  receiptValue: { fontSize: 14, color: '#0f172a', fontWeight: '800' },
});
