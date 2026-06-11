import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import Purchases, { PurchasesPackage } from 'react-native-purchases';

export default function PaywallScreen() {
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);

  useEffect(() => {
    void loadOfferings();
  }, []);

  async function loadOfferings() {
    try {
      const offerings = await Purchases.getOfferings();
      const pkgs = offerings.current?.availablePackages ?? [];
      setPackages(pkgs);
    } catch {
      // Show empty state — user can still dismiss
    } finally {
      setLoading(false);
    }
  }

  async function purchase(pkg: PurchasesPackage) {
    setPurchasing(true);
    try {
      await Purchases.purchasePackage(pkg);
      router.back();
    } catch (e: unknown) {
      const err = e as { userCancelled?: boolean; message?: string };
      if (!err.userCancelled) {
        Alert.alert('Ошибка', err.message ?? 'Не удалось выполнить покупку');
      }
    } finally {
      setPurchasing(false);
    }
  }

  async function restore() {
    setPurchasing(true);
    try {
      await Purchases.restorePurchases();
      router.back();
    } catch {
      Alert.alert('Ошибка', 'Не удалось восстановить покупки');
    } finally {
      setPurchasing(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Pro-подписка</Text>
      <Text style={styles.subtitle}>Безлимитные записи и все инструменты мастера</Text>

      <View style={styles.features}>
        {[
          'Неограниченное число записей',
          'Расширенная CRM и рассылки',
          'Приоритетная поддержка',
        ].map((f) => (
          <Text key={f} style={styles.feature}>
            ✓ {f}
          </Text>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#7C3AED" style={{ marginTop: 32 }} />
      ) : packages.length === 0 ? (
        <Text style={styles.empty}>Покупки недоступны</Text>
      ) : (
        packages.map((pkg) => (
          <Pressable
            key={pkg.identifier}
            style={[styles.buyBtn, purchasing && styles.btnDisabled]}
            onPress={() => void purchase(pkg)}
            disabled={purchasing}
          >
            {purchasing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.buyBtnTitle}>{pkg.product.title}</Text>
                <Text style={styles.buyBtnPrice}>{pkg.product.priceString} / мес</Text>
              </>
            )}
          </Pressable>
        ))
      )}

      <Pressable onPress={() => void restore()} disabled={purchasing} style={styles.restoreBtn}>
        <Text style={styles.restoreText}>Восстановить покупки</Text>
      </Pressable>

      <Pressable onPress={() => router.back()} style={styles.cancelBtn}>
        <Text style={styles.cancelText}>Не сейчас</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, alignItems: 'center', padding: 24, backgroundColor: '#fff' },
  title: { fontSize: 28, fontWeight: '700', marginTop: 32, textAlign: 'center' },
  subtitle: { fontSize: 15, color: '#6B7280', marginTop: 8, textAlign: 'center', lineHeight: 22 },
  features: { marginTop: 32, width: '100%', gap: 12 },
  feature: { fontSize: 16, color: '#111827' },
  empty: { marginTop: 40, fontSize: 15, color: '#9CA3AF' },
  buyBtn: {
    width: '100%',
    backgroundColor: '#7C3AED',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  btnDisabled: { opacity: 0.6 },
  buyBtnTitle: { color: '#fff', fontSize: 17, fontWeight: '600' },
  buyBtnPrice: { color: '#DDD6FE', fontSize: 13, marginTop: 2 },
  restoreBtn: { marginTop: 20 },
  restoreText: { color: '#7C3AED', fontSize: 14 },
  cancelBtn: { marginTop: 16 },
  cancelText: { color: '#9CA3AF', fontSize: 14 },
});
