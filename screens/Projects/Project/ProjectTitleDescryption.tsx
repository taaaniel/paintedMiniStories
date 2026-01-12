import React, { useEffect, useState } from 'react';
import { LayoutAnimation, Platform, Text, UIManager, View } from 'react-native';
import GemButton from '../../../components/buttons/GemButton';
import { styles } from './ProjectTitleDescryption.styles';

type Props = {
  title: string;
  description?: string | null;
};

const BUTTON_SIZE = 25;

// Simple plus/minus icon nodes sized for GemButton size=15
const PlusIcon = () => (
  <View style={styles.iconWrap}>
    <View style={styles.plusBarH} />
    <View style={styles.plusBarV} />
  </View>
);
const MinusIcon = () => (
  <View style={styles.iconWrap}>
    <View style={styles.minusBar} />
  </View>
);

export default function ProjectTitleDescryption({ title, description }: Props) {
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [collapsedH, setCollapsedH] = useState<number | null>(null);
  const [containerW, setContainerW] = useState<number | null>(null);

  const estimatedTwoLineChars = React.useMemo(() => {
    const fontSize = (styles.subtitle as any)?.fontSize ?? 14;
    const avgCharW = fontSize * 0.55; // heuristic average width
    const reservedRight = BUTTON_SIZE + 6; // keep space so button won't cover ellipsis
    const width = (containerW ?? 0) - reservedRight;
    if (width > 0) {
      const perLine = Math.max(Math.floor(width / avgCharW), 24);
      return perLine * 2;
    }
    return 120; // fallback
  }, [containerW]);
  const canExpandDescription =
    !!description && description.length > estimatedTwoLineChars;

  useEffect(() => {
    setShowFullDescription(false);
    setCollapsedH(null);
  }, [description]);

  useEffect(() => {
    if (
      Platform.OS === 'android' &&
      UIManager.setLayoutAnimationEnabledExperimental
    ) {
      try {
        UIManager.setLayoutAnimationEnabledExperimental(true);
      } catch {
        // silent
      }
    }
  }, []);

  const toggle = () => {
    LayoutAnimation.configureNext({
      duration: 260,
      update: {
        type: LayoutAnimation.Types.easeInEaseOut,
        property: LayoutAnimation.Properties.opacity,
      },
      create: {
        type: LayoutAnimation.Types.easeInEaseOut,
        property: LayoutAnimation.Properties.opacity,
      },
      delete: {
        type: LayoutAnimation.Types.easeInEaseOut,
        property: LayoutAnimation.Properties.opacity,
      },
    });
    setShowFullDescription((p) => !p);
  };

  return (
    <View style={{ flexShrink: 1, marginBottom: description ? -15 : 15 }}>
      <Text style={styles.title}>{title}</Text>
      {description ? (
        <View
          style={{ marginTop: 6, position: 'relative' }}
          onLayout={(e) => setContainerW(e.nativeEvent.layout.width)}
        >
          <View
            style={{
              // keep space for ellipsis + button when collapsed
              paddingRight:
                canExpandDescription && !showFullDescription
                  ? BUTTON_SIZE + 6
                  : 0,
              // keep space for bottom-left button so it doesn't cover text
              paddingBottom: canExpandDescription
                ? showFullDescription
                  ? 55 + BUTTON_SIZE + 6
                  : 25 + BUTTON_SIZE + 6
                : 0,
            }}
          >
            <Text
              style={styles.subtitle}
              numberOfLines={showFullDescription ? undefined : 2}
              ellipsizeMode="tail"
              onLayout={(e) => {
                if (!showFullDescription && collapsedH == null) {
                  setCollapsedH(e.nativeEvent.layout.height);
                }
              }}
            >
              {description}
            </Text>
          </View>

          {canExpandDescription && (
            <View
              style={{
                position: 'absolute',
                right: 0,
                bottom: showFullDescription ? 55 : 20,
                zIndex: 25,
              }}
            >
              <GemButton
                size={BUTTON_SIZE}
                color="#d0175e"
                iconNode={showFullDescription ? <MinusIcon /> : <PlusIcon />}
                onPress={toggle}
              />
            </View>
          )}
        </View>
      ) : null}
    </View>
  );
}
