// MetronomeApp.tsx
import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  SafeAreaView,
  ImageBackground,
  Animated,
  Dimensions,
} from 'react-native';
import { Audio } from 'expo-av';

const { width } = Dimensions.get('window');

const MetronomeApp: React.FC = () => {
  const [bpm, setBpm] = useState<number>(120);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [beat, setBeat] = useState<number>(1);
  const [timeSignature, setTimeSignature] = useState<number>(4);

  // refs
  const intervalRef = useRef<number | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Ajusta la ruta si tu fichero está en otro sitio.
  // Si el archivo está en: projectRoot/assets/fondo.jpg => require('../../assets/fondo.jpg') desde src/components
  const BACKGROUND_IMAGE = require('../../assets/images/fondo.jpg');

  useEffect(() => {
    // No await en cleanup (useEffect no puede devolver promesa)
    setupAudio();
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (soundRef.current) {
        // ignora errores al descargar sonido en cleanup
        soundRef.current.unloadAsync().catch(() => {});
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setupAudio = async () => {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });
    } catch (e) {
      console.warn('Audio setup error:', e);
    }
  };

  // Reproducir click sencillo (usa base64 embed para evitar depender de assets adicionales)
  // Puedes sustituir por un archivo físico si prefieres.
  const playClick = async (isAccent = false) => {
    try {
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }

      const { sound } = await Audio.Sound.createAsync(
        {
          uri:
            'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmYeBzo=',
        },
        { shouldPlay: false }
      );

      soundRef.current = sound;
      await sound.setVolumeAsync(isAccent ? 1.0 : 0.7);
      await sound.playAsync();
    } catch (e) {
      console.warn('playClick error', e);
    }
  };

  const animatePulse = () => {
    Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1.15, duration: 80, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1, duration: 120, useNativeDriver: true }),
    ]).start();
  };

  const startMetronome = () => {
    if (isPlaying) return;
    setIsPlaying(true);
    setBeat(1);
    const intervalMs = Math.max(10, Math.round(60000 / bpm)); // ms por pulso

    // primer click inmediato
    playClick(true);
    animatePulse();

    const id = setInterval(() => {
      setBeat((prev) => {
        const next = prev >= timeSignature ? 1 : prev + 1;
        playClick(next === 1);
        animatePulse();
        return next;
      });
    }, intervalMs);

    // Type cast para compatibilidad TS (React Native devuelve number)
    intervalRef.current = id as unknown as number;
  };

  const stopMetronome = () => {
    setIsPlaying(false);
    setBeat(1);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const changeBpm = (delta: number) => {
    const next = Math.max(40, Math.min(240, bpm + delta));
    setBpm(next);
    // si está sonando, reinicia para aplicar nuevo tempo
    if (isPlaying) {
      stopMetronome();
      // pequeña latencia para reiniciar intervalo
      setTimeout(startMetronome, 50);
    }
  };

  const toggleTimeSignature = () => {
    if (isPlaying) return;
    setTimeSignature((p) => (p === 4 ? 3 : 4));
    setBeat(1);
  };

  const renderBeatIndicators = () => {
    const items = [];
    for (let i = 1; i <= timeSignature; i++) {
      const active = isPlaying && i === beat;
      items.push(
        <View
          key={i}
          style={[
            styles.beatIndicator,
            {
              backgroundColor: active ? '#FF6B6B' : 'rgba(255,255,255,0.18)',
              borderColor: active ? '#fff' : 'rgba(255,255,255,0.35)',
              transform: [{ scale: i === 1 ? 1.25 : 1 }],
            },
          ]}
        />
      );
    }
    return items;
  };

  const getTempoName = () => {
    if (bpm < 60) return 'Largo';
    if (bpm < 76) return 'Adagio';
    if (bpm < 108) return 'Andante';
    if (bpm < 120) return 'Moderato';
    if (bpm < 168) return 'Allegro';
    return 'Presto';
  };

  return (
    <ImageBackground source={BACKGROUND_IMAGE} style={styles.bg} resizeMode="cover">
      <View style={styles.overlay} />
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

        <View style={styles.header}>
          <Text style={styles.title}>Metrónomo</Text>
          <Text style={styles.subtitle}>{getTempoName()}</Text>
        </View>

        <View style={styles.beatsWrap}>
          <View style={styles.beats}>{renderBeatIndicators()}</View>
          <Text style={styles.beatText}>
            Beat {beat} / {timeSignature}
          </Text>
        </View>

        <View style={styles.center}>
          <Animated.View
            style={[
              styles.circle,
              {
                transform: [{ scale: pulseAnim }],
                backgroundColor: isPlaying ? '#ff4757' : '#3742fa',
                shadowColor: isPlaying ? '#ff4757' : '#3742fa',
              },
            ]}
          >
            <Text style={styles.bpmNumber}>{bpm}</Text>
            <Text style={styles.bpmLabel}>BPM</Text>
          </Animated.View>
        </View>

        <View style={styles.controls}>
          <View style={styles.row}>
            <TouchableOpacity style={styles.smallBtn} onPress={() => changeBpm(-5)}>
              <Text style={styles.smallBtnText}>-5</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.smallBtn} onPress={() => changeBpm(-1)}>
              <Text style={styles.smallBtnText}>-1</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.smallBtn} onPress={() => changeBpm(1)}>
              <Text style={styles.smallBtnText}>+1</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.smallBtn} onPress={() => changeBpm(5)}>
              <Text style={styles.smallBtnText}>+5</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.row}>
            <TouchableOpacity
              style={[styles.bigBtn, { backgroundColor: isPlaying ? '#ff3838' : '#2ed573' }]}
              onPress={isPlaying ? stopMetronome : startMetronome}
            >
              <Text style={styles.bigBtnText}>{isPlaying ? 'DETENER' : 'INICIAR'}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.signatureBtn} onPress={toggleTimeSignature} disabled={isPlaying}>
              <Text style={styles.signatureText}>{timeSignature}/4</Text>
              <Text style={styles.signatureLabel}>Compás</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  bg: { flex: 1, width: '100%', height: '100%', backgroundColor: '#0f0f23' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  container: { flex: 1, paddingHorizontal: 18 },
  header: { alignItems: 'center', marginTop: 8 },
  title: { color: '#fff', fontSize: 34, fontWeight: '800', letterSpacing: 1.5 },
  subtitle: { color: 'rgba(255,255,255,0.9)', marginTop: 6 },

  beatsWrap: { alignItems: 'center', marginTop: 18 },
  beats: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  beatIndicator: { width: 16, height: 16, borderRadius: 8, marginHorizontal: 8, borderWidth: 2 },
  beatText: { color: 'rgba(255,255,255,0.9)', marginTop: 8 },

  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  circle: {
    width: Math.min(220, width - 80),
    height: Math.min(220, width - 80),
    borderRadius: 200,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.12)',
    elevation: 10,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
  },
  bpmNumber: { color: '#fff', fontSize: 44, fontWeight: '900' },
  bpmLabel: { color: 'rgba(255,255,255,0.9)', marginTop: 6, fontWeight: '700' },

  controls: { paddingBottom: 28 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 10, alignItems: 'center' },
  smallBtn: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    padding: 12,
    borderRadius: 12,
    minWidth: 64,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  smallBtnText: { color: '#fff', fontWeight: '700' },

  bigBtn: {
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 26,
    minWidth: 160,
    alignItems: 'center',
  },
  bigBtnText: { color: '#fff', fontWeight: '900' },

  signatureBtn: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  signatureText: { color: '#fff', fontSize: 20, fontWeight: '800' },
  signatureLabel: { color: 'rgba(255,255,255,0.9)', fontSize: 12, marginTop: 4 },
});

export default MetronomeApp;
