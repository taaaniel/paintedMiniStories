import React from 'react';
import { View } from 'react-native';
import RectangleGemButton from '../buttons/RectangleGemButton';
import CustomDialog from '../../components/CustomDialog/CustomDialog';

interface Props {
  visible: boolean;
  projectName?: string;
  onCancel: () => void;
  onConfirm: () => void;
}

export default function DeleteProjectDialog({
  visible,
  projectName,
  onCancel,
  onConfirm,
}: Props) {
  if (!visible) return null;

  return (
    <CustomDialog
      visible={visible}
      onClose={onCancel}
      title={`Are you sure you want to delete\nproject “${projectName || ''}”?`}
      maxWidth={420}
      actions={
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <RectangleGemButton
            width={150}
            fontSize={18}
            label="No"
            onPress={onCancel}
            color="#336E9E"
            active
          />
          <RectangleGemButton
            width={150}
            fontSize={18}
            label="Yes"
            onPress={onConfirm}
            color="#336E9E"
            active
          />
        </View>
      }
    />
  );
}
