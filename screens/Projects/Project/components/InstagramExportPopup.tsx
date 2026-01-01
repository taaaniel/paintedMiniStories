import { Image } from 'expo-image';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import React from 'react';
import { ActivityIndicator, Alert, Text, View } from 'react-native';
import CustomDialog from '../../../../components/CustomDialog/CustomDialog';
import RectangleGemButton from '../../../../components/buttons/RectangleGemButton';

type Props = {
  visible: boolean;
  imageUri: string | null;
  onClose: () => void;
};

export default function InstagramExportPopup({
  visible,
  imageUri,
  onClose,
}: Props) {
  const [busy, setBusy] = React.useState<'saving' | 'sharing' | null>(null);

  const saveToGallery = React.useCallback(async () => {
    if (!imageUri) return;
    try {
      setBusy('saving');
      const perm = await MediaLibrary.requestPermissionsAsync();
      if (perm.status !== 'granted') {
        Alert.alert(
          'Permission needed',
          'Please allow access to Photos to save the image.',
        );
        return;
      }

      await MediaLibrary.createAssetAsync(imageUri);
      Alert.alert('Saved', 'Image saved to your gallery.');
    } catch (e) {
      console.error('Failed to save image:', e);
      Alert.alert('Error', 'Failed to save the image.');
    } finally {
      setBusy(null);
    }
  }, [imageUri]);

  const publishToInstagram = React.useCallback(async () => {
    if (!imageUri) return;
    try {
      setBusy('sharing');
      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        Alert.alert(
          'Not available',
          'Sharing is not available on this device.',
        );
        return;
      }
      await Sharing.shareAsync(imageUri, {
        mimeType: 'image/png',
        dialogTitle: 'Publish on Instagram',
      });
    } catch (e) {
      console.error('Failed to share image:', e);
      Alert.alert('Error', 'Failed to open sharing.');
    } finally {
      setBusy(null);
    }
  }, [imageUri]);

  if (!visible) return null;

  const isReady = !!imageUri && !busy;

  return (
    <CustomDialog
      visible={visible}
      onClose={onClose}
      title="Instagram export"
      maxWidth={420}
      actions={
        <View style={{ width: '100%', gap: 10, alignItems: 'center' }}>
          <View
            style={{
              flexDirection: 'row',
              gap: 10,
              justifyContent: 'center',
              flexWrap: 'nowrap',
            }}
          >
            <RectangleGemButton
              width={100}
              fontSize={12}
              label={busy === 'saving' ? 'SAVING…' : 'SAVE'}
              color={'#65dc25'}
              onPress={isReady ? () => void saveToGallery() : undefined}
            />
            <RectangleGemButton
              width={100}
              fontSize={12}
              label={busy === 'sharing' ? 'OPENING…' : 'PUBLISH'}
              color={'#d0175e'}
              onPress={isReady ? () => void publishToInstagram() : undefined}
            />
            <RectangleGemButton
              width={100}
              fontSize={12}
              label={'CLOSE'}
              color={'#C2B39A'}
              onPress={busy ? undefined : onClose}
            />
          </View>
        </View>
      }
    >
      <View style={{ width: '100%' }}>
        {imageUri ? (
          <View
            style={{
              width: '100%',
              height: 520,
              borderRadius: 12,
              overflow: 'hidden',
              backgroundColor: '#111',
            }}
          >
            <Image
              source={{ uri: imageUri }}
              contentFit="contain"
              cachePolicy="none"
              style={{ width: '100%', height: '100%' }}
            />
          </View>
        ) : (
          <View
            style={{
              width: '100%',
              height: 520,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ActivityIndicator size="large" />
            <Text style={{ marginTop: 10, color: '#666' }}>Preparing…</Text>
          </View>
        )}
      </View>
    </CustomDialog>
  );
}
