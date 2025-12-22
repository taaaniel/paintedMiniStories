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
  const [btnPos, setBtnPos] = useState<{ top: number; left: number } | null>(
    null,
  );

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
    setBtnPos(null);
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
    <View style={{ flexShrink: 1 }}>
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
              onTextLayout={(e) => {
                const lines = e.nativeEvent.lines;
                if (!lines?.length) return;
                const lastIdx = showFullDescription
                  ? lines.length - 1
                  : Math.min(1, lines.length - 1);
                const last = lines[lastIdx];
                const containerWidth = containerW ?? 0;

                // Use line.x + line.width to position at the actual end of text
                const gap = showFullDescription ? 0 : 8; // small gap before ellipsis when collapsed
                const rawLeft = (last.x ?? 0) + (last.width ?? 0) + gap;
                const maxLeft = Math.max(0, containerWidth - BUTTON_SIZE - 2);
                const left = Math.max(0, Math.min(rawLeft, maxLeft));

                const top = last.y + last.height / 2 - BUTTON_SIZE / 2;
                setBtnPos({ top, left });
              }}
            >
              {description}
            </Text>
          </View>

          {canExpandDescription && (
            <View
              style={{
                position: 'absolute',
                left:
                  btnPos?.left ??
                  Math.max(0, (containerW ?? 0) - BUTTON_SIZE - 2), // fallback to right edge
                top:
                  btnPos?.top ??
                  // fallback vertically: align with middle of collapsed 2nd line or top
                  (collapsedH ? collapsedH / 2 - BUTTON_SIZE / 2 : 0),
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
