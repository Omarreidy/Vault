import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, SafeAreaView } from 'react-native';
import { WebView } from 'react-native-webview';
import { COLORS, FONTS, SPACING } from '../constants/theme';

function mdToHtml(md: string): string {
  const lines = md.split('\n');
  let html = '';
  let inList = false;
  let inPara = false;

  const inline = (s: string) =>
    s
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>');

  for (const raw of lines) {
    const line = raw.trim();
    if (line.startsWith('### ')) {
      if (inList) { html += '</ul>'; inList = false; }
      if (inPara)  { html += '</p>'; inPara = false; }
      html += `<h3>${inline(line.slice(4))}</h3>`;
    } else if (line.startsWith('## ')) {
      if (inList) { html += '</ul>'; inList = false; }
      if (inPara)  { html += '</p>'; inPara = false; }
      html += `<h2>${inline(line.slice(3))}</h2>`;
    } else if (line.startsWith('# ')) {
      if (inList) { html += '</ul>'; inList = false; }
      if (inPara)  { html += '</p>'; inPara = false; }
      html += `<h1>${inline(line.slice(2))}</h1>`;
    } else if (line.startsWith('- ')) {
      if (inPara) { html += '</p>'; inPara = false; }
      if (!inList) { html += '<ul>'; inList = true; }
      html += `<li>${inline(line.slice(2))}</li>`;
    } else if (line === '') {
      if (inList) { html += '</ul>'; inList = false; }
      if (inPara)  { html += '</p>'; inPara = false; }
    } else {
      if (inList) { html += '</ul>'; inList = false; }
      if (!inPara) { html += '<p>'; inPara = true; } else { html += ' '; }
      html += inline(line);
    }
  }
  if (inList) html += '</ul>';
  if (inPara)  html += '</p>';
  return html;
}

const CSS = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    background: #0A0A0B;
    color: #B0A090;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    font-size: 15px;
    line-height: 1.75;
    padding: 24px 20px 80px;
  }
  h1 {
    color: #C9A84C;
    font-size: 22px;
    font-weight: 700;
    letter-spacing: -0.5px;
    margin-bottom: 6px;
  }
  h2 {
    color: #E8E0D0;
    font-size: 15px;
    font-weight: 700;
    letter-spacing: 0.3px;
    margin-top: 32px;
    margin-bottom: 10px;
    padding-bottom: 8px;
    border-bottom: 1px solid #1E1E20;
  }
  h3 {
    color: #A89070;
    font-size: 13px;
    font-weight: 600;
    letter-spacing: 0.2px;
    margin-top: 20px;
    margin-bottom: 6px;
  }
  p { margin: 8px 0; }
  strong { color: #E8E0D0; font-weight: 600; }
  ul { padding-left: 20px; margin: 8px 0; }
  li { margin: 5px 0; }
  a { color: #C9A84C; text-decoration: none; }
`;

interface Props {
  visible: boolean;
  title: string;
  content: string;
  onClose: () => void;
}

export default function PolicyModal({ visible, title, content, onClose }: Props) {
  const html = `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>${CSS}</style></head><body>${mdToHtml(content)}</body></html>`;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
            <Text style={styles.closeTxt}>×</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.divider} />
        <WebView
          source={{ html }}
          style={styles.web}
          originWhitelist={['*']}
          scrollEnabled
          showsVerticalScrollIndicator={false}
          backgroundColor={COLORS.background}
        />
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
  title: {
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
  web: { flex: 1, backgroundColor: COLORS.background },
});
