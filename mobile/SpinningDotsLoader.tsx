import React, { useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Animated,
  Easing,
  ViewStyle
} from 'react-native';

interface SpinningDotsLoaderProps {
  size?: number;
  message?: string;
  isDark?: boolean;
  fullScreen?: boolean;
  style?: ViewStyle;
}

export function SpinningDotsLoader({
  size = 52,
  message,
  isDark = false,
  fullScreen = false,
  style
}: SpinningDotsLoaderProps) {
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 1200,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    animation.start();
    return () => animation.stop();
  }, [rotateAnim]);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const numDots = 8;
  const dotSize = Math.max(7, Math.round(size * 0.16));
  const radius = (size - dotSize) / 2;

  // Blue and Light Purple color palette
  const dotColors = [
    '#2563EB', // Primary Blue
    '#A855F7', // Light Purple
    '#3B82F6', // Bright Blue
    '#8B5CF6', // Purple
    '#60A5FA', // Light Blue
    '#C084FC', // Soft Light Purple
    '#1D4ED8', // Deep Blue
    '#DDD6FE', // Pale Purple
  ];

  const renderDots = () => {
    const dots = [];
    for (let i = 0; i < numDots; i++) {
      const angle = (i * 2 * Math.PI) / numDots;
      const x = radius + radius * Math.cos(angle);
      const y = radius + radius * Math.sin(angle);
      
      const opacity = 0.3 + 0.7 * ((i + 1) / numDots);
      const scale = 0.6 + 0.4 * ((i + 1) / numDots);
      const color = dotColors[i % dotColors.length];

      dots.push(
        <View
          key={i}
          style={{
            position: 'absolute',
            left: x,
            top: y,
            width: dotSize,
            height: dotSize,
            borderRadius: dotSize / 2,
            backgroundColor: color,
            opacity: opacity,
            transform: [{ scale }],
            shadowColor: color,
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.8,
            shadowRadius: 3,
            elevation: 3,
          }}
        />
      );
    }
    return dots;
  };

  const loaderContent = (
    <View style={styles.contentContainer}>
      <Animated.View
        style={[
          {
            width: size,
            height: size,
            transform: [{ rotate: spin }],
            position: 'relative',
          },
        ]}
      >
        {renderDots()}
      </Animated.View>
      {message ? (
        <Text style={[styles.messageText, { color: isDark ? '#94A3B8' : '#475569' }]}>
          {message}
        </Text>
      ) : null}
    </View>
  );

  if (fullScreen) {
    return (
      <View style={[styles.fullScreenContainer, isDark && styles.darkBg, style]}>
        {loaderContent}
      </View>
    );
  }

  return <View style={[styles.inlineContainer, style]}>{loaderContent}</View>;
}

const styles = StyleSheet.create({
  fullScreenContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 20,
  },
  darkBg: {
    backgroundColor: '#0B1329',
  },
  inlineContainer: {
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  messageText: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0.2,
  },
});
