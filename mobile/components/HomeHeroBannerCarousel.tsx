import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  Dimensions,
  Linking,
  Platform,
} from 'react-native';
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  ExternalLink,
  Sparkles,
} from 'lucide-react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SLIDE_WIDTH = SCREEN_WIDTH - 32; // Standard padding 16 on each side
const BANNER_HEIGHT = 195;

export interface BannerSlide {
  id: string;
  type: string;
  bgGradient?: string;
  badgeTop: string;
  badgeTopSub?: string;
  headlineMain: string;
  features: string[];
  actionText: string;
  actionSub?: string;
  badgeLogo: string;
  badgeBrand: string;
  tagline: string;
  imageUrl?: string;
  url?: string;
  notice?: any;
}

interface HomeHeroBannerCarouselProps {
  notices: any[];
  language?: 'en' | 'hi';
  isDark?: boolean;
  onSelectNotice?: (notice: any) => void;
  onOpenPassClaim?: () => void;
}

export default function HomeHeroBannerCarousel({
  notices = [],
  language = 'en',
  isDark = false,
  onSelectNotice,
  onOpenPassClaim,
}: HomeHeroBannerCarouselProps) {
  const isHindi = language === 'hi';
  const scrollRef = useRef<ScrollView>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userInteracted, setUserInteracted] = useState(false);

  // Extract admin-uploaded banners (announcements or notices with an imageUrl)
  const adminBanners = (notices || []).filter(
    (n) => (n.imageUrl && n.imageUrl.trim() !== '') || n.category === 'announcement'
  );

  // Curated Fallback Slide (matches website Super PASS @ ₹1 Promo Banner)
  const fallbackBanners: BannerSlide[] = [
    {
      id: 'pass_pro_trial',
      type: 'pass_promo',
      badgeTop: isHindi ? 'असीमित अध्ययन' : 'Unlimited Learning',
      badgeTopSub: isHindi ? 'हेतु' : 'For',
      headlineMain: isHindi ? '375+ परीक्षाएं केवल ₹1 में' : '375+ EXAMS AT ₹1',
      features: isHindi
        ? [
            '375+ परीक्षाओं के कोर्सेज',
            'लाइव और रिकॉर्डेड क्लासेस',
            'अभ्यास प्रश्न एवं क्विज़',
            'स्टडी नोट्स एवं PYPs',
          ]
        : [
            'Courses for 375+ Exams',
            'Live & Rec. Classes',
            'Practice Ques.',
            'Notes & PYPs',
          ],
      actionText: isHindi ? 'ट्रायल शुरू करें @ ₹1 🎁' : 'Start Trial @ ₹1 🎁',
      actionSub: isHindi ? '*1 वर्ष का मुफ़्त पास प्रो उपलब्ध' : '*1-Year Free Gift Available',
      badgeLogo: 'Super PASS',
      badgeBrand: 'MOCK TEST',
      tagline: isHindi ? 'ऑटोरेन्यू 2 दिन बाद' : 'AUTORENEWS AFTER 2 DAYS',
    },
  ];

  const allSlides: BannerSlide[] =
    adminBanners.length > 0
      ? adminBanners.map((ann, idx) => ({
          id: `custom_${ann.id || idx}`,
          type: 'custom',
          badgeTop: (ann.category || 'NOTICE').toUpperCase(),
          badgeTopSub: '',
          headlineMain: isHindi && ann.titleHi ? ann.titleHi : ann.title,
          features: [
            isHindi ? 'आधिकारिक परीक्षा घोषणा' : 'Official Exam Announcement',
            isHindi ? 'मॉक टेस्ट व अभ्यास' : 'Mock Tests & Practice Pack',
          ],
          actionText: isHindi ? 'टेस्ट शुरू करें 🔗' : 'Start Test 🔗',
          actionSub: ann.date || '',
          badgeLogo: 'UPDATE',
          badgeBrand: 'PORTAL',
          tagline: 'OFFICIAL NOTIFICATION',
          imageUrl: ann.imageUrl,
          url: ann.url,
          notice: ann,
        }))
      : fallbackBanners;

  const totalSlides = allSlides.length;

  const scrollToIndex = useCallback(
    (index: number) => {
      const clampedIndex = (index + totalSlides) % totalSlides;
      setCurrentIndex(clampedIndex);
      scrollRef.current?.scrollTo({
        x: clampedIndex * SLIDE_WIDTH,
        animated: true,
      });
    },
    [totalSlides]
  );

  const handleNext = useCallback(() => {
    scrollToIndex(currentIndex + 1);
  }, [currentIndex, scrollToIndex]);

  const handlePrev = useCallback(() => {
    scrollToIndex(currentIndex - 1);
  }, [currentIndex, scrollToIndex]);

  // Auto-Slide Timer (every 4.5 seconds unless user manually interacts)
  useEffect(() => {
    if (totalSlides <= 1 || userInteracted) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => {
        const next = (prev + 1) % totalSlides;
        scrollRef.current?.scrollTo({
          x: next * SLIDE_WIDTH,
          animated: true,
        });
        return next;
      });
    }, 4500);

    return () => clearInterval(interval);
  }, [totalSlides, userInteracted]);

  const handleSlidePress = (slide: BannerSlide) => {
    if (slide.type === 'pass_promo') {
      if (onOpenPassClaim) onOpenPassClaim();
      return;
    }
    if (slide.url && slide.url.trim() !== '') {
      Linking.openURL(slide.url.trim());
      return;
    }
    if (slide.notice && onSelectNotice) {
      onSelectNotice(slide.notice);
    }
  };

  const renderSlideContent = (slide: BannerSlide) => {
    // 1. Custom Image Banner (Full-Bleed Graphic)
    if (slide.imageUrl && slide.imageUrl.trim() !== '') {
      const cleanUri = slide.imageUrl.trim().replace(/^http:\/\//i, 'https://');
      return (
        <TouchableOpacity
          activeOpacity={0.92}
          onPress={() => handleSlidePress(slide)}
          style={styles.imageBannerWrapper}
        >
          <Image
            source={{ uri: cleanUri }}
            style={styles.bannerImage}
            resizeMode="cover"
          />
        </TouchableOpacity>
      );
    }

    // 2. High-Fidelity Website Design Graphic Banner (Super PASS / Rich Card)
    const isPromo = slide.type === 'pass_promo';

    return (
      <TouchableOpacity
        activeOpacity={0.92}
        onPress={() => handleSlidePress(slide)}
        style={[
          styles.cardBannerWrapper,
          {
            backgroundColor: isPromo ? '#040F2D' : isDark ? '#070E22' : '#0B1635',
            borderColor: isPromo ? 'rgba(59, 130, 246, 0.4)' : 'rgba(148, 163, 184, 0.2)',
          },
        ]}
      >
        {/* Glow ambient background circles */}
        <View style={[styles.glowCircle, { top: -30, left: -30, backgroundColor: 'rgba(59, 130, 246, 0.18)' }]} />
        <View style={[styles.glowCircle, { bottom: -30, right: -30, backgroundColor: 'rgba(6, 182, 212, 0.15)' }]} />

        {/* Top Header Row */}
        <View style={styles.topRow}>
          {/* Top Headline Pill */}
          <View style={styles.pillWhite}>
            <Text style={styles.pillWhiteText}>{slide.badgeTop}</Text>
          </View>

          {/* Top Right Brand Badges */}
          <View style={styles.brandRow}>
            {isPromo && (
              <View style={styles.trialPill}>
                <Text style={styles.trialPillText}>₹1 TRIAL</Text>
              </View>
            )}
            <View style={styles.brandBadgeContainer}>
              <Text style={styles.brandBadgePrefix}>{slide.badgeBrand}</Text>
              <View style={styles.brandBadgeLogoBox}>
                <Text style={styles.brandBadgeLogoText}>{slide.badgeLogo}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Middle Main Content */}
        <View style={styles.middleRow}>
          {/* Left Column: Headline + Checklist + CTA */}
          <View style={{ flex: 1, justifyContent: 'center' }}>
            <Text style={styles.mainHeadline} numberOfLines={1}>
              {slide.headlineMain}
            </Text>

            {/* Checklist Container */}
            <View style={styles.checklistContainer}>
              {slide.features.slice(0, 4).map((feature, idx) => (
                <View key={idx} style={styles.checkItem}>
                  <View style={styles.checkCircle}>
                    <CheckCircle2 size={10} color="#2563EB" strokeWidth={3} />
                  </View>
                  <Text style={styles.checkText} numberOfLines={1}>
                    {feature}
                  </Text>
                </View>
              ))}
            </View>

            {/* CTA Button & Subtitle */}
            <View style={styles.ctaRow}>
              <View style={styles.ctaButton}>
                <Text style={styles.ctaButtonText}>{slide.actionText}</Text>
              </View>
              {slide.actionSub ? (
                <Text style={styles.actionSubText} numberOfLines={1}>
                  {slide.actionSub}
                </Text>
              ) : null}
            </View>
          </View>

          {/* Right Column: 3D Metallic Rupee Coin Graphic */}
          {isPromo && (
            <View style={styles.coinContainer}>
              <View style={styles.coinOuterRing}>
                <View style={styles.coinInnerBody}>
                  <Text style={styles.coinLabel}>{isHindi ? 'रुपया' : 'RUPEE'}</Text>
                  <Text style={styles.coinAmount}>₹1</Text>
                  <Text style={styles.coinYear}>2026</Text>
                </View>
              </View>
              <View style={styles.coinTaglineBox}>
                <Text style={styles.coinTaglineText}>{slide.tagline}</Text>
              </View>
            </View>
          )}
        </View>

        {/* Bottom subtle progress line */}
        <View style={styles.bottomProgressLine} />
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Carousel Scroll Container */}
      <View style={{ position: 'relative', width: '100%', height: BANNER_HEIGHT }}>
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScrollBeginDrag={() => setUserInteracted(true)}
          onMomentumScrollEnd={(event) => {
            const offset = event.nativeEvent.contentOffset.x;
            const newIndex = Math.round(offset / SLIDE_WIDTH);
            setCurrentIndex(newIndex);
          }}
          style={styles.scrollView}
          contentContainerStyle={{ alignItems: 'center' }}
        >
          {allSlides.map((slide, idx) => (
            <View key={slide.id || idx} style={{ width: SLIDE_WIDTH, height: BANNER_HEIGHT }}>
              {renderSlideContent(slide)}
            </View>
          ))}
        </ScrollView>

        {/* Floating Left Arrow Button */}
        {totalSlides > 1 && (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => {
              setUserInteracted(true);
              handlePrev();
            }}
            style={[styles.floatingArrowBtn, { left: 4 }]}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <ChevronLeft size={16} color="#1E293B" strokeWidth={2.5} />
          </TouchableOpacity>
        )}

        {/* Floating Right Arrow Button */}
        {totalSlides > 1 && (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => {
              setUserInteracted(true);
              handleNext();
            }}
            style={[styles.floatingArrowBtn, { right: 4 }]}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <ChevronRight size={16} color="#1E293B" strokeWidth={2.5} />
          </TouchableOpacity>
        )}
      </View>

      {/* Centered Pagination Indicator Dots */}
      {totalSlides > 1 && (
        <View style={styles.dotsRow}>
          {allSlides.map((_, idx) => (
            <TouchableOpacity
              key={idx}
              onPress={() => {
                setUserInteracted(true);
                scrollToIndex(idx);
              }}
              style={[
                styles.dot,
                currentIndex === idx
                  ? styles.dotActive
                  : isDark
                  ? { backgroundColor: '#475569' }
                  : { backgroundColor: '#CBD5E1' },
              ]}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: 12,
  },
  scrollView: {
    width: SLIDE_WIDTH,
    height: BANNER_HEIGHT,
    borderRadius: 16,
  },
  imageBannerWrapper: {
    width: SLIDE_WIDTH,
    height: BANNER_HEIGHT,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#0F172A',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  cardBannerWrapper: {
    width: SLIDE_WIDTH,
    height: BANNER_HEIGHT,
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    justifyContent: 'space-between',
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5,
  },
  glowCircle: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 2,
  },
  pillWhite: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  pillWhiteText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#0A192F',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  trialPill: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 12,
  },
  trialPillText: {
    fontSize: 8.5,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: 0.5,
  },
  brandBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  brandBadgePrefix: {
    fontSize: 8,
    fontWeight: '900',
    color: '#F472B6',
    letterSpacing: 0.8,
  },
  brandBadgeLogoBox: {
    backgroundColor: '#E11D48',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  brandBadgeLogoText: {
    fontSize: 8,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  middleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    marginVertical: 4,
    zIndex: 2,
  },
  mainHeadline: {
    fontSize: 14,
    fontWeight: '900',
    color: '#67E8F9', // cyan-300
    letterSpacing: -0.2,
    marginBottom: 4,
  },
  checklistContainer: {
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    borderWidth: 1,
    borderColor: 'rgba(96, 165, 250, 0.2)',
    borderRadius: 10,
    padding: 6,
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 4,
    columnGap: 6,
    marginBottom: 6,
  },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    width: '47%',
  },
  checkCircle: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkText: {
    fontSize: 8.5,
    fontWeight: '700',
    color: '#FFFFFF',
    flex: 1,
  },
  ctaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  ctaButton: {
    backgroundColor: '#059669', // emerald-600
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 5,
    elevation: 3,
  },
  ctaButtonText: {
    fontSize: 9.5,
    fontWeight: '900',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  actionSubText: {
    fontSize: 8,
    fontWeight: '600',
    color: '#CBD5E1',
    flex: 1,
  },
  coinContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 72,
    marginRight: -2,
  },
  coinOuterRing: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: '#94A3B8',
    padding: 2,
    shadowColor: '#38BDF8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  coinInnerBody: {
    flex: 1,
    borderRadius: 29,
    backgroundColor: '#E2E8F0',
    borderWidth: 1,
    borderColor: '#94A3B8',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coinLabel: {
    fontSize: 6.5,
    fontWeight: '900',
    color: '#475569',
    letterSpacing: 0.5,
  },
  coinAmount: {
    fontSize: 17,
    fontWeight: '900',
    color: '#0F172A',
    lineHeight: 18,
  },
  coinYear: {
    fontSize: 6,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  coinTaglineBox: {
    marginTop: 4,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
    paddingHorizontal: 4,
    paddingVertical: 1.5,
    borderRadius: 6,
  },
  coinTaglineText: {
    fontSize: 6,
    fontWeight: '900',
    color: '#67E8F9',
    textTransform: 'uppercase',
  },
  bottomProgressLine: {
    width: '100%',
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 1,
    zIndex: 2,
  },
  floatingArrowBtn: {
    position: 'absolute',
    top: '50%',
    marginTop: -14,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
    zIndex: 10,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    marginTop: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotActive: {
    backgroundColor: '#06B6D4', // cyan-500
    width: 14,
    height: 6,
    borderRadius: 3,
  },
});
