import React from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import SimplyButton from '../buttons/SimplyButton';
import { styles } from './CustomDialog.styles';

interface CustomDialogProps {
  visible: boolean;
  title?: string;
  onClose: () => void;
  children?: React.ReactNode;
  maxWidth?: number;
  onConfirm?: () => void;
  actions?: React.ReactNode; // custom actions slot
  confirmLabel?: string; // NEW
  cancelLabel?: string; // NEW
}

export default function CustomDialog({
  visible,
  title,
  onClose,
  children,
  maxWidth = 420,
  onConfirm,
  actions,
  confirmLabel = 'Yes', // NEW
  cancelLabel = 'No', // NEW
}: CustomDialogProps) {
  if (!visible) return null;
  return (
    <Modal visible transparent animationType="fade">
      <View style={styles.backdrop}>
        <View style={[styles.card, { maxWidth }]}>
          {title ? <Text style={styles.title}>{title}</Text> : null}
          {children}
          {/* Prefer custom actions if provided */}
          {actions ? (
            <View style={{ marginTop: 12 }}>{actions}</View>
          ) : onConfirm ? (
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'center',
                alignItems: 'center',
                gap: 8,
                marginTop: 12,
              }}
            >
              <SimplyButton width={120} label={cancelLabel} onPress={onClose} />
              <SimplyButton
                width={120}
                label={confirmLabel}
                onPress={onConfirm}
              />
            </View>
          ) : null}
          <View style={styles.closeWrap}>
            <Pressable onPress={onClose} hitSlop={10}>
              <Text style={styles.closeText}>×</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
