import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Modal, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, FONTS, SPACING, RADIUS } from '../constants/theme';

// ─── Inline bold renderer ─────────────────────────────────────────────────────

function InlineText({ text, style }: { text: string; style?: object }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <Text style={style}>
      {parts.map((part, i) =>
        part.startsWith('**') && part.endsWith('**')
          ? <Text key={i} style={styles.bold}>{part.slice(2, -2)}</Text>
          : <Text key={i}>{part}</Text>
      )}
    </Text>
  );
}

// ─── Markdown → React Native nodes ───────────────────────────────────────────

function renderMarkdown(md: string) {
  const lines = md.split('\n');
  const nodes: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i].trim();

    if (line.startsWith('### ')) {
      nodes.push(<Text key={i} style={styles.h3}>{line.slice(4)}</Text>);
    } else if (line.startsWith('## ')) {
      nodes.push(<Text key={i} style={styles.h2}>{line.slice(3)}</Text>);
    } else if (line.startsWith('# ')) {
      nodes.push(<Text key={i} style={styles.h1}>{line.slice(2)}</Text>);
    } else if (line.startsWith('- ')) {
      nodes.push(
        <View key={i} style={styles.listRow}>
          <Text style={styles.bullet}>·</Text>
          <InlineText text={line.slice(2)} style={styles.listTxt} />
        </View>
      );
    } else if (line !== '') {
      nodes.push(<InlineText key={i} text={line} style={styles.para} />);
    }

    i++;
  }

  return nodes;
}

// ─── Modal ────────────────────────────────────────────────────────────────────

interface Props {
  visible: boolean;
  title: string;
  content: string;
  onClose: () => void;
}

export default function PolicyModal({ visible, title, content, onClose }: Props) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{title}</Text>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
            <Text style={styles.closeTxt}>×</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.divider} />
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {renderMarkdown(content)}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  headerTitle: {
    fontSize: FONTS.sizes.xl,
    fontWeight: FONTS.weights.bold,
    color: COLORS.text,
    letterSpacing: FONTS.tracking.tight,
  },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: COLORS.sheetBg,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth, borderColor: COLORS.border,
  },
  closeTxt: { fontSize: 20, color: COLORS.textDim, lineHeight: 22 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: COLORS.border },

  scroll: { padding: SPACING.lg, paddingBottom: 60, gap: 10 },

  h1: {
    fontSize: FONTS.sizes.xl,
    fontWeight: FONTS.weights.bold,
    color: COLORS.gold,
    letterSpacing: FONTS.tracking.tight,
    marginTop: SPACING.sm,
    marginBottom: 4,
  },
  h2: {
    fontSize: FONTS.sizes.md,
    fontWeight: FONTS.weights.bold,
    color: COLORS.text,
    letterSpacing: 0.3,
    marginTop: SPACING.lg,
    paddingBottom: SPACING.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  h3: {
    fontSize: FONTS.sizes.sm,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.textDim,
    marginTop: SPACING.sm,
  },
  para: {
    fontSize: FONTS.sizes.md,
    color: COLORS.textDim,
    lineHeight: FONTS.sizes.md * 1.75,
  },
  bold: {
    fontWeight: FONTS.weights.semibold,
    color: COLORS.text,
  },
  listRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    paddingLeft: SPACING.sm,
  },
  bullet: {
    fontSize: FONTS.sizes.md,
    color: COLORS.gold,
    lineHeight: FONTS.sizes.md * 1.75,
  },
  listTxt: {
    flex: 1,
    fontSize: FONTS.sizes.md,
    color: COLORS.textDim,
    lineHeight: FONTS.sizes.md * 1.75,
  },
});
