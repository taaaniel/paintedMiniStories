import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  contentClip: {
    flex: 1,
    width: '100%',
    overflow: 'hidden',
  },
  scrollView: {
    flex: 1,
    width: '100%',
  },
  scrollContent: {
    paddingTop: 4,
    paddingBottom: 68,
  },
  content: {
    width: '100%',
    paddingTop: 4,
    paddingBottom: 68,
  },
  title: {
    fontFamily: 'AntonSC',
    fontSize: 32,
    lineHeight: 60,
    fontWeight: '400',
    letterSpacing: 1,
    textAlign: 'center',
    color: '#2D2D2D',
  },

  sectionTitle: {
    fontFamily: 'AntonSC',
    fontSize: 22,
    lineHeight: 32,
    fontWeight: '400',
    letterSpacing: 0.6,
    color: '#2D2D2D',
    marginTop: 8,
    marginBottom: 12,
    paddingHorizontal: 16,
  },

  fieldWrap: {
    paddingHorizontal: 16,
  },

  subLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0E2B6D',
    paddingHorizontal: 16,
    marginTop: 10,
    marginBottom: 8,
  },

  avatarRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
    paddingHorizontal: 16,
  },
  avatarLeftCol: {
    alignItems: 'center',
  },
  avatarLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0E2B6D',
    marginBottom: 8,
    textAlign: 'center',
  },
  avatarButtonsCol: {
    flex: 1,
    alignItems: 'flex-end',
  },
  avatarHelperLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0E2B6D',
    marginBottom: 8,
    textAlign: 'right',
    alignSelf: 'flex-end',
  },
  avatarButtonsRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
    justifyContent: 'flex-end',
    flexWrap: 'nowrap',
  },
  avatarGemWrap: {
    alignItems: 'center',
  },
  avatarGemLabel: {
    marginTop: 4,
    fontSize: 11,
    fontWeight: '700',
    color: '#2D2D2D',
  },
  avatarPreview: {
    width: 92,
    height: 92,
    borderRadius: 46,
    overflow: 'hidden',
    backgroundColor: '#E8E8E8',
    borderWidth: 2,
    borderColor: '#2D2D2D',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    flex: 1,
    backgroundColor: '#E8E8E8',
  },

  saveRow: {
    paddingHorizontal: 16,
    marginTop: 18,
    alignItems: 'flex-end',
  },
});
