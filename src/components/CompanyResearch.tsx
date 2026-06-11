import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Animated, Dimensions,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { COLORS, FONTS, SPACING, RADIUS, CARD_SHADOW } from '../constants/theme';
import {
  fetchCompanyResearch, POPULAR_TICKERS, CompanyReport,
  VERDICT_COLORS, CONFIDENCE_COLORS, SEVERITY_COLORS, THREAT_COLORS,
  ANSWER_COLORS, ANSWER_BG,
} from '../services/companyResearch';

const { width } = Dimensions.get('window');

// ─── Section wrapper with collapse ───────────────────────────────────────────

function Section({ title, children, defaultOpen = true }: {
  title: string; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <View style={secStyles.wrap}>
      <TouchableOpacity style={secStyles.header} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); setOpen(o => !o); }} activeOpacity={0.8}>
        <Text style={secStyles.title}>{title}</Text>
        <Text style={secStyles.chevron}>{open ? '▴' : '▾'}</Text>
      </TouchableOpacity>
      {open && <View style={secStyles.body}>{children}</View>}
    </View>
  );
}

const secStyles = StyleSheet.create({
  wrap: { gap: 0 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: SPACING.md, paddingHorizontal: SPACING.lg,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.border,
  },
  title: { fontSize: FONTS.sizes.sm, fontWeight: FONTS.weights.bold, color: COLORS.text, letterSpacing: 0.3 },
  chevron: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted },
  body: { padding: SPACING.lg, gap: SPACING.md },
});

// ─── Full report ─────────────────────────────────────────────────────────────

function ReportView({ report, onBack }: { report: CompanyReport; onBack: () => void }) {
  const slideX = useRef(new Animated.Value(40)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const verdictColor = VERDICT_COLORS[report.verdict];

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: false }),
      Animated.timing(slideX,  { toValue: 0, duration: 300, useNativeDriver: false }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[{ flex: 1 }, { opacity, transform: [{ translateX: slideX }] }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

        {/* Back */}
        <TouchableOpacity style={rStyles.backBtn} onPress={onBack} activeOpacity={0.7}>
          <Text style={rStyles.backTxt}>← Research</Text>
        </TouchableOpacity>

        {/* Hero card */}
        <View style={[rStyles.hero, CARD_SHADOW, { borderColor: verdictColor + '40' }]}>
          <View style={[rStyles.heroAccent, { backgroundColor: verdictColor }]} />
          <View style={rStyles.heroInner}>
            <View style={rStyles.heroTop}>
              <View>
                <Text style={rStyles.ticker}>{report.ticker}</Text>
                <Text style={rStyles.companyName}>{report.name}</Text>
                <Text style={rStyles.sector}>{report.sector}</Text>
              </View>
              <View style={rStyles.heroRight}>
                <View style={[rStyles.verdictBadge, { backgroundColor: verdictColor }]}>
                  <Text style={rStyles.verdictTxt}>{report.verdict}</Text>
                </View>
                <Text style={rStyles.price}>{report.price}</Text>
                <Text style={[rStyles.change, { color: report.change >= 0 ? '#7EB8A4' : '#C97A6E' }]}>
                  {report.change >= 0 ? '+' : ''}{report.change}% today
                </Text>
              </View>
            </View>
            <Text style={rStyles.oneLiner}>{report.oneLiner}</Text>
            <View style={rStyles.keyStats}>
              {[
                { label: 'MARKET CAP', val: report.marketCap ?? 'N/A' },
                { label: 'REVENUE', val: (report.revenue ?? 'N/A').split(' ')[0] },
                { label: 'NET MARGIN', val: report.netMargin != null ? `${report.netMargin}%` : 'N/A' },
                { label: 'P/E', val: report.peRatio ?? 'N/A' },
              ].map(s => (
                <View key={s.label} style={rStyles.stat}>
                  <Text style={rStyles.statLabel}>{s.label}</Text>
                  <Text style={rStyles.statVal}>{s.val}</Text>
                </View>
              ))}
            </View>
            {/* Moat score */}
            <View style={rStyles.moatRow}>
              <Text style={rStyles.moatLabel}>ECONOMIC MOAT</Text>
              <View style={rStyles.moatBar}>
                {Array.from({ length: 10 }).map((_, i) => (
                  <View key={i} style={[rStyles.moatDot, i < report.moatScore && { backgroundColor: verdictColor }]} />
                ))}
              </View>
              <Text style={[rStyles.moatScore, { color: verdictColor }]}>{report.moatScore}/10</Text>
            </View>
          </View>
        </View>

        {/* VAULT Verdict */}
        {(() => {
          const v = report.investmentVerdict;
          const aColor = ANSWER_COLORS[v.answer];
          const aBg    = ANSWER_BG[v.answer];
          return (
            <View style={[vStyles.card, { backgroundColor: aBg, borderColor: aColor + '50' }]}>
              <View style={vStyles.top}>
                <View style={vStyles.left}>
                  <Text style={vStyles.eyebrow}>VAULT VERDICT</Text>
                  <Text style={vStyles.question}>Should you invest in {report.ticker}?</Text>
                </View>
                <View style={[vStyles.answerBadge, { backgroundColor: aColor }]}>
                  <Text style={vStyles.answerTxt}>{v.answer}</Text>
                </View>
              </View>
              <Text style={[vStyles.summary, { color: aColor === ANSWER_COLORS.YES ? '#5a9e8a' : aColor === ANSWER_COLORS.NO ? '#a85e52' : '#9a7a3a' }]}>
                {v.summary}
              </Text>
              <View style={vStyles.reasons}>
                {v.reasons.map((r, i) => (
                  <View key={i} style={vStyles.reasonRow}>
                    <Text style={[vStyles.reasonNum, { color: aColor }]}>{i + 1}</Text>
                    <Text style={vStyles.reasonTxt}>{r}</Text>
                  </View>
                ))}
              </View>
              {v.caution && (
                <View style={[vStyles.caution, { borderColor: aColor + '40' }]}>
                  <Text style={vStyles.cautionEye}>⚠ ONE THING TO KNOW</Text>
                  <Text style={vStyles.cautionTxt}>{v.caution}</Text>
                </View>
              )}
            </View>
          );
        })()}

        {/* Sections */}
        <View style={rStyles.sections}>

          {/* Business Model */}
          <Section title="Business Model">
            <Text style={rStyles.body}>{report.businessModel ?? 'Loading...'}</Text>
            {(report.revenueStreams ?? []).length > 0 && (
              <>
                <Text style={rStyles.subHead}>HOW THEY MAKE MONEY</Text>
                {(report.revenueStreams ?? []).map((s: any) => (
                  <View key={s.name} style={rStyles.streamRow}>
                    <View style={rStyles.streamTop}>
                      <Text style={rStyles.streamName}>{s.name}</Text>
                      <Text style={[rStyles.streamPct, { color: verdictColor }]}>{s.pct}%</Text>
                    </View>
                    <View style={rStyles.streamBarBg}>
                      <View style={[rStyles.streamBarFill, { width: `${s.pct}%`, backgroundColor: verdictColor + '80' }]} />
                    </View>
                    <Text style={rStyles.streamDesc}>{s.description}</Text>
                  </View>
                ))}
              </>
            )}
          </Section>

          {/* Financials */}
          <Section title="Financials">
            <View style={rStyles.grid}>
              {[
                { label: 'ANNUAL REVENUE', val: report.revenue ?? 'N/A' },
                { label: 'REVENUE GROWTH', val: report.revenueGrowth != null ? `${report.revenueGrowth > 0 ? '+' : ''}${report.revenueGrowth}% YoY` : 'N/A', color: (report.revenueGrowth ?? 0) >= 0 ? '#7EB8A4' : '#C97A6E' },
                { label: 'NET INCOME', val: report.netIncome ?? 'N/A' },
                { label: 'NET MARGIN', val: report.netMargin != null ? `${report.netMargin}%` : 'N/A' },
                { label: 'OPERATING EXP.', val: report.operatingExpenses ?? 'N/A' },
                { label: 'CASH ON HAND', val: report.cashOnHand ?? 'N/A' },
                { label: 'P/E RATIO', val: report.peRatio ?? 'N/A' },
                { label: 'EMPLOYEES', val: report.employees ?? 'N/A' },
              ].map(s => (
                <View key={s.label} style={rStyles.gridCell}>
                  <Text style={rStyles.gridLabel}>{s.label}</Text>
                  <Text style={[rStyles.gridVal, s.color ? { color: s.color } : {}]}>{s.val}</Text>
                </View>
              ))}
            </View>
          </Section>

          {/* Market */}
          {(report.tam || report.marketShare) && (
            <Section title="Market Size & Opportunity">
              <View style={rStyles.marketCards}>
                <View style={rStyles.marketCard}>
                  <Text style={rStyles.marketLabel}>TOTAL ADDRESSABLE MARKET</Text>
                  <Text style={[rStyles.marketVal, { color: verdictColor }]}>{report.tam ?? 'N/A'}</Text>
                </View>
                <View style={rStyles.marketCard}>
                  <Text style={rStyles.marketLabel}>CURRENT MARKET SHARE</Text>
                  <Text style={[rStyles.marketVal, { color: verdictColor }]}>{report.marketShare ?? 'N/A'}</Text>
                </View>
              </View>
              {report.targetMarket && (
                <>
                  <Text style={rStyles.subHead}>TARGET CUSTOMER</Text>
                  <Text style={rStyles.body}>{report.targetMarket}</Text>
                </>
              )}
            </Section>
          )}

          {/* Moat */}
          {(report.moatFactors ?? []).length > 0 && (
            <Section title="Economic Moat">
              {(report.moatFactors ?? []).map((f: any, i: number) => (
                <View key={i} style={rStyles.bulletRow}>
                  <View style={[rStyles.bulletDot, { backgroundColor: verdictColor }]} />
                  <Text style={rStyles.bulletTxt}>{f}</Text>
                </View>
              ))}
            </Section>
          )}

          {/* Journey + Roadmap Timeline */}
          {((report.journey ?? []).length > 0 || (report.roadmap ?? []).length > 0) && (
            <Section title="Journey & Roadmap">
              <Text style={rStyles.timelineHint}>← Scroll to explore the full timeline →</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={rStyles.timeline}>
                {(report.journey ?? []).map((m: any, i: number) => (
                  <View key={`j${i}`} style={rStyles.timelineItem}>
                    <View style={[rStyles.timelineDot, rStyles.timelineDotPast]} />
                    {i < (report.journey ?? []).length - 1 && <View style={[rStyles.timelineLine, rStyles.timelineLinePast]} />}
                    <Text style={rStyles.timelineYear}>{m.year}</Text>
                    <Text style={rStyles.timelineEvent}>{m.event}</Text>
                    <Text style={rStyles.timelineImpact}>{m.impact}</Text>
                  </View>
                ))}
                <View style={rStyles.nowMarker}>
                  <View style={rStyles.nowLine} />
                  <Text style={rStyles.nowLabel}>NOW</Text>
                  <View style={rStyles.nowLine} />
                </View>
                {(report.roadmap ?? []).map((r: any, i: number) => {
                  const color = CONFIDENCE_COLORS[r.confidence as keyof typeof CONFIDENCE_COLORS] ?? COLORS.gold;
                  return (
                    <View key={`r${i}`} style={rStyles.timelineItem}>
                      {i > 0 && <View style={[rStyles.timelineLine, rStyles.timelineLineFuture, { position: 'absolute', left: -40, top: 6 }]} />}
                      <View style={[rStyles.timelineDot, { backgroundColor: color }]} />
                      <Text style={[rStyles.timelineYear, { color }]}>{r.timeframe}</Text>
                      <Text style={rStyles.timelineEvent}>{r.initiative}</Text>
                      <Text style={rStyles.timelineImpact}>{r.detail}</Text>
                      <View style={[rStyles.confidencePill, { borderColor: color + '50', backgroundColor: color + '15' }]}>
                        <Text style={[rStyles.confidenceTxt, { color }]}>{(r.confidence ?? '').toUpperCase()}</Text>
                      </View>
                    </View>
                  );
                })}
              </ScrollView>
            </Section>
          )}

          {/* Leadership */}
          {(report.executives ?? []).length > 0 && (
            <Section title="Leadership">
              {(report.executives ?? []).map((e: any, i: number) => (
                <View key={i} style={[rStyles.execCard, i > 0 && rStyles.execCardBorder]}>
                  <View style={rStyles.execAvatar}>
                    <Text style={rStyles.execInitials}>{(e.name ?? '??').split(' ').map((n: string) => n[0]).join('').slice(0, 2)}</Text>
                  </View>
                  <View style={rStyles.execInfo}>
                    <Text style={rStyles.execName}>{e.name}</Text>
                    <Text style={rStyles.execRole}>{e.role}</Text>
                    {e.prior && <Text style={rStyles.execPrior}>Previously: {e.prior}</Text>}
                    {e.wins && <Text style={rStyles.execWins}>◆ {e.wins}</Text>}
                  </View>
                </View>
              ))}
            </Section>
          )}

          {/* Risks & Weaknesses */}
          {((report.risks ?? []).length > 0 || (report.weaknesses ?? []).length > 0) && (
            <Section title="Risks & Weaknesses">
              {(report.risks ?? []).length > 0 && (
                <>
                  <Text style={rStyles.subHead}>STRUCTURAL RISKS</Text>
                  {(report.risks ?? []).map((r: any, i: number) => {
                    const color = SEVERITY_COLORS[r.severity as keyof typeof SEVERITY_COLORS] ?? COLORS.gold;
                    return (
                      <View key={i} style={[rStyles.riskCard, { borderLeftColor: color }]}>
                        <View style={rStyles.riskTop}>
                          <Text style={rStyles.riskCategory}>{r.category}</Text>
                          <View style={[rStyles.riskBadge, { backgroundColor: color + '20', borderColor: color + '50' }]}>
                            <Text style={[rStyles.riskBadgeTxt, { color }]}>{(r.severity ?? '').toUpperCase()}</Text>
                          </View>
                        </View>
                        <Text style={rStyles.riskDesc}>{r.description}</Text>
                      </View>
                    );
                  })}
                </>
              )}
              {(report.weaknesses ?? []).length > 0 && (
                <>
                  <Text style={[rStyles.subHead, { marginTop: SPACING.md }]}>WHAT THEY'RE DOING WRONG</Text>
                  {(report.weaknesses ?? []).map((w: any, i: number) => (
                    <View key={i} style={rStyles.weakRow}>
                      <Text style={rStyles.weakDot}>✗</Text>
                      <Text style={rStyles.weakTxt}>{w}</Text>
                    </View>
                  ))}
                </>
              )}
            </Section>
          )}

          {/* Competition */}
          {(report.competitors ?? []).length > 0 && (
            <Section title="Competitive Landscape">
              {(report.competitors ?? []).map((c: any, i: number) => {
                const color = THREAT_COLORS[c.threat as keyof typeof THREAT_COLORS] ?? COLORS.gold;
                return (
                  <View key={i} style={[rStyles.compRow, i > 0 && rStyles.compRowBorder]}>
                    <View style={[rStyles.compTicker, { borderColor: color + '50', backgroundColor: color + '10' }]}>
                      <Text style={[rStyles.compTickerTxt, { color }]}>{c.ticker}</Text>
                    </View>
                    <View style={rStyles.compInfo}>
                      <View style={rStyles.compNameRow}>
                        <Text style={rStyles.compName}>{c.name}</Text>
                        <View style={[rStyles.threatBadge, { backgroundColor: color + '15', borderColor: color + '40' }]}>
                          <Text style={[rStyles.threatTxt, { color }]}>{(c.threat ?? '').toUpperCase()} THREAT</Text>
                        </View>
                      </View>
                      <Text style={rStyles.compDetail}>{c.detail}</Text>
                    </View>
                  </View>
                );
              })}
            </Section>
          )}

        </View>
      </ScrollView>
    </Animated.View>
  );
}

// ─── Featured card grid ───────────────────────────────────────────────────────

function FeaturedCard({ report, onPress }: { report: CompanyReport; onPress: () => void }) {
  const scale = useRef(new Animated.Value(1)).current;
  const color = VERDICT_COLORS[report.verdict];

  return (
    <Animated.View style={[fStyles.card, CARD_SHADOW, { transform: [{ scale }] }]}>
      <TouchableOpacity
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
          Animated.sequence([
            Animated.timing(scale, { toValue: 0.97, duration: 80, useNativeDriver: false }),
            Animated.timing(scale, { toValue: 1,    duration: 80, useNativeDriver: false }),
          ]).start(onPress);
        }}
        activeOpacity={1}
      >
        <View style={[fStyles.accent, { backgroundColor: color }]} />
        <View style={fStyles.inner}>
          <View style={fStyles.top}>
            <Text style={fStyles.ticker}>{report.ticker}</Text>
            <View style={[fStyles.verdict, { backgroundColor: color + '20', borderColor: color + '50' }]}>
              <Text style={[fStyles.verdictTxt, { color }]}>{report.verdict}</Text>
            </View>
          </View>
          <Text style={fStyles.name} numberOfLines={1}>{report.name}</Text>
          <Text style={fStyles.price}>{report.price}
            <Text style={[fStyles.change, { color: report.change >= 0 ? '#7EB8A4' : '#C97A6E' }]}>
              {'  '}{report.change >= 0 ? '+' : ''}{report.change}%
            </Text>
          </Text>
          <View style={fStyles.moatRow}>
            <Text style={fStyles.moatLabel}>MOAT</Text>
            <Text style={[fStyles.moatScore, { color }]}>{report.moatScore}/10</Text>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const fStyles = StyleSheet.create({
  card: {
    width: (width - SPACING.lg * 2 - SPACING.md) / 2,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  accent: { height: 2 },
  inner: { padding: SPACING.md, gap: 5 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  ticker: { fontSize: FONTS.sizes.lg, fontWeight: FONTS.weights.heavy, color: COLORS.text },
  verdict: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: RADIUS.full, borderWidth: 1 },
  verdictTxt: { fontSize: 7, fontWeight: FONTS.weights.bold, letterSpacing: 0.6 },
  name: { fontSize: FONTS.sizes.xs, color: COLORS.textDim },
  price: { fontSize: FONTS.sizes.md, fontWeight: FONTS.weights.bold, color: COLORS.text },
  change: { fontSize: FONTS.sizes.xs, fontWeight: FONTS.weights.semibold },
  moatRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  moatLabel: { fontSize: 8, color: COLORS.textMuted, fontWeight: FONTS.weights.bold, letterSpacing: 0.8 },
  moatScore: { fontSize: FONTS.sizes.sm, fontWeight: FONTS.weights.bold },
});

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function CompanyResearch() {
  const [query, setQuery]               = useState('');
  const [activeReport, setActiveReport] = useState<CompanyReport | null>(null);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState('');
  const [notFound, setNotFound]         = useState(false);
  const inputRef = useRef<any>(null);

  const runSearch = async (ticker: string) => {
    const t = ticker.trim().toUpperCase();
    if (!t) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setLoading(true);
    setError('');
    try {
      const report = await fetchCompanyResearch(t);
      setActiveReport(report);
    } catch (err: any) {
      setError(`Could not load research for ${t}. Check the ticker and try again.`);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    const raw = inputRef.current?.value ?? inputRef.current?._lastNativeText ?? query;
    const ticker = String(raw).trim().toUpperCase() || query.trim().toUpperCase();
    runSearch(ticker);
  };

  const handleQuickSearch = (ticker: string) => {
    setQuery(ticker);
    runSearch(ticker);
  };

  if (activeReport) {
    return (
      <ReportView
        report={activeReport}
        onBack={() => { setActiveReport(null); setQuery(''); setNotFound(false); }}
      />
    );
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

      {/* Search bar */}
      <View style={styles.searchWrap}>
        <TextInput
          ref={inputRef}
          style={styles.searchInput}
          placeholder="Enter a ticker — AAPL, NVDA, TSLA, META"
          placeholderTextColor={COLORS.textMuted}
          value={query}
          onChangeText={t => { setQuery(t); setNotFound(false); }}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
        />
        <TouchableOpacity style={styles.searchBtn} onPress={handleSearch} activeOpacity={0.85}>
          <Text style={styles.searchBtnTxt}>Analyze</Text>
        </TouchableOpacity>
      </View>

      {/* Quick access tickers */}
      <View style={styles.quickRow}>
        {POPULAR_TICKERS.slice(0, 4).map(t => (
          <TouchableOpacity key={t} style={styles.quickBtn} onPress={() => handleQuickSearch(t)} activeOpacity={0.8}>
            <Text style={styles.quickTxt}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {!!error && (
        <Text style={{ color: COLORS.red, fontSize: FONTS.sizes.xs, textAlign: 'center', marginTop: SPACING.sm }}>
          {error}
        </Text>
      )}

      {loading && (
        <View style={styles.loadingCard}>
          <Text style={styles.loadingTitle}>Analyzing {query.trim().toUpperCase()}...</Text>
          <Text style={styles.loadingSub}>Running deep research on this investment</Text>
          <View style={styles.loadingDots}>
            <View style={[styles.loadingDot, { opacity: 1 }]} />
            <View style={[styles.loadingDot, { opacity: 0.6 }]} />
            <View style={[styles.loadingDot, { opacity: 0.3 }]} />
          </View>
        </View>
      )}

      {/* Quick research prompts */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Popular Research</Text>
        <Text style={styles.sectionSub}>Tap any company to run live AI research</Text>
      </View>

      <View style={styles.quickGrid}>
        {POPULAR_TICKERS.map(t => (
          <TouchableOpacity
            key={t}
            style={[styles.quickGridBtn, CARD_SHADOW, { shadowOpacity: 0.06 }]}
            onPress={() => handleQuickSearch(t)}
            activeOpacity={0.8}
          >
            <Text style={styles.quickGridTicker}>{t}</Text>
            <Text style={styles.quickGridLabel}>Analyze →</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={{ height: SPACING.xl }} />
    </ScrollView>
  );
}

const vStyles = StyleSheet.create({
  card: {
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
    borderRadius: RADIUS.xl,
    borderWidth: 1.5,
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  left: { flex: 1, gap: 3, paddingRight: SPACING.md },
  eyebrow: { fontSize: 9, color: COLORS.textMuted, fontWeight: FONTS.weights.bold, letterSpacing: FONTS.tracking.widest },
  question: { fontSize: FONTS.sizes.md, fontWeight: FONTS.weights.bold, color: COLORS.text, lineHeight: 22 },
  answerBadge: {
    width: 64, height: 64, borderRadius: 32,
    alignItems: 'center', justifyContent: 'center',
  },
  answerTxt: { fontSize: FONTS.sizes.md, fontWeight: FONTS.weights.heavy, color: '#FFF', letterSpacing: 1 },
  summary: { fontSize: FONTS.sizes.sm, lineHeight: 20, fontWeight: FONTS.weights.medium },
  reasons: { gap: SPACING.sm },
  reasonRow: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm },
  reasonNum: {
    width: 20, height: 20, borderRadius: 10,
    fontSize: 10, fontWeight: FONTS.weights.heavy,
    textAlign: 'center', lineHeight: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    overflow: 'hidden',
  },
  reasonTxt: { flex: 1, fontSize: FONTS.sizes.sm, color: COLORS.text, lineHeight: 20 },
  caution: {
    borderWidth: 1,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    gap: 5,
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  cautionEye: { fontSize: 8, fontWeight: FONTS.weights.bold, color: COLORS.textMuted, letterSpacing: 1 },
  cautionTxt: { fontSize: FONTS.sizes.xs, color: COLORS.textDim, lineHeight: 18 },
});

// Shared report styles
const rStyles = StyleSheet.create({
  backBtn: { paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md },
  backTxt: { fontSize: FONTS.sizes.sm, color: COLORS.gold, fontWeight: FONTS.weights.semibold },

  hero: {
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  heroAccent: { height: 3 },
  heroInner: { padding: SPACING.lg, gap: SPACING.md },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  ticker: { fontSize: 36, fontWeight: FONTS.weights.heavy, color: COLORS.text, letterSpacing: -1 },
  companyName: { fontSize: FONTS.sizes.md, fontWeight: FONTS.weights.semibold, color: COLORS.text },
  sector: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, marginTop: 2 },
  heroRight: { alignItems: 'flex-end', gap: 5 },
  verdictBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.full },
  verdictTxt: { fontSize: FONTS.sizes.xs, fontWeight: FONTS.weights.heavy, color: '#FFF', letterSpacing: 0.8 },
  price: { fontSize: FONTS.sizes.xl, fontWeight: FONTS.weights.bold, color: COLORS.text },
  change: { fontSize: FONTS.sizes.xs, fontWeight: FONTS.weights.semibold },
  oneLiner: { fontSize: FONTS.sizes.sm, color: COLORS.textDim, lineHeight: 20, fontStyle: 'italic' },
  keyStats: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  stat: {
    flex: 1, minWidth: '45%',
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    gap: 3,
  },
  statLabel: { fontSize: 8, color: COLORS.textMuted, fontWeight: FONTS.weights.bold, letterSpacing: 0.8 },
  statVal: { fontSize: FONTS.sizes.md, fontWeight: FONTS.weights.bold, color: COLORS.text },
  moatRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  moatLabel: { fontSize: 8, color: COLORS.textMuted, fontWeight: FONTS.weights.bold, letterSpacing: 0.8 },
  moatBar: { flex: 1, flexDirection: 'row', gap: 3 },
  moatDot: { flex: 1, height: 6, borderRadius: 3, backgroundColor: COLORS.border },
  moatScore: { fontSize: FONTS.sizes.sm, fontWeight: FONTS.weights.bold },

  sections: {
    marginHorizontal: SPACING.lg,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },

  body: { fontSize: FONTS.sizes.sm, color: COLORS.textDim, lineHeight: 20 },
  subHead: { fontSize: 9, color: COLORS.textMuted, fontWeight: FONTS.weights.bold, letterSpacing: FONTS.tracking.widest },

  streamRow: { gap: 5 },
  streamTop: { flexDirection: 'row', justifyContent: 'space-between' },
  streamName: { fontSize: FONTS.sizes.sm, fontWeight: FONTS.weights.semibold, color: COLORS.text },
  streamPct: { fontSize: FONTS.sizes.sm, fontWeight: FONTS.weights.bold },
  streamBarBg: { height: 4, backgroundColor: COLORS.border, borderRadius: 2, overflow: 'hidden' },
  streamBarFill: { height: 4, borderRadius: 2 },
  streamDesc: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  gridCell: {
    width: '48%',
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    gap: 3,
  },
  gridLabel: { fontSize: 8, color: COLORS.textMuted, fontWeight: FONTS.weights.bold, letterSpacing: 0.8 },
  gridVal: { fontSize: FONTS.sizes.md, fontWeight: FONTS.weights.bold, color: COLORS.text },

  marketCards: { flexDirection: 'row', gap: SPACING.sm },
  marketCard: {
    flex: 1, backgroundColor: COLORS.background,
    borderRadius: RADIUS.md, padding: SPACING.sm, gap: 5,
  },
  marketLabel: { fontSize: 8, color: COLORS.textMuted, fontWeight: FONTS.weights.bold, letterSpacing: 0.8 },
  marketVal: { fontSize: FONTS.sizes.sm, fontWeight: FONTS.weights.bold, lineHeight: 18 },

  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm },
  bulletDot: { width: 6, height: 6, borderRadius: 3, marginTop: 6 },
  bulletTxt: { flex: 1, fontSize: FONTS.sizes.sm, color: COLORS.textDim, lineHeight: 20 },

  timelineHint: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, textAlign: 'center', marginBottom: SPACING.md },
  timeline: { paddingHorizontal: SPACING.sm, gap: 0, flexDirection: 'row', alignItems: 'flex-start' },
  timelineItem: { width: 160, paddingRight: SPACING.lg, position: 'relative', gap: 4 },
  timelineDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.textMuted, marginBottom: 4 },
  timelineDotPast: { backgroundColor: COLORS.textMuted },
  timelineLine: { position: 'absolute', top: 4, left: 10, width: 150, height: 1 },
  timelineLinePast: { backgroundColor: COLORS.border },
  timelineLineFuture: { backgroundColor: COLORS.gold + '40' },
  timelineYear: { fontSize: FONTS.sizes.xs, fontWeight: FONTS.weights.bold, color: COLORS.textMuted, letterSpacing: 0.5 },
  timelineEvent: { fontSize: FONTS.sizes.xs, fontWeight: FONTS.weights.semibold, color: COLORS.text, lineHeight: 16 },
  timelineImpact: { fontSize: 10, color: COLORS.textMuted, lineHeight: 14 },
  nowMarker: { alignItems: 'center', paddingHorizontal: SPACING.sm, gap: 4, width: 60 },
  nowLine: { width: 1, height: 40, backgroundColor: COLORS.gold },
  nowLabel: { fontSize: 9, fontWeight: FONTS.weights.heavy, color: COLORS.gold, letterSpacing: 1.5 },
  confidencePill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: RADIUS.full, borderWidth: 1, marginTop: 2,
  },
  confidenceTxt: { fontSize: 7, fontWeight: FONTS.weights.bold, letterSpacing: 0.5 },

  execCard: { flexDirection: 'row', gap: SPACING.md },
  execCardBorder: { paddingTop: SPACING.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: COLORS.border },
  execAvatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: COLORS.goldGlow,
    borderWidth: 1.5, borderColor: COLORS.gold + '50',
    alignItems: 'center', justifyContent: 'center',
  },
  execInitials: { fontSize: FONTS.sizes.xs, fontWeight: FONTS.weights.bold, color: COLORS.gold },
  execInfo: { flex: 1, gap: 3 },
  execName: { fontSize: FONTS.sizes.md, fontWeight: FONTS.weights.bold, color: COLORS.text },
  execRole: { fontSize: FONTS.sizes.xs, color: COLORS.gold },
  execPrior: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted },
  execWins: { fontSize: FONTS.sizes.xs, color: COLORS.textDim, lineHeight: 16 },

  riskCard: {
    padding: SPACING.md, borderLeftWidth: 3,
    backgroundColor: COLORS.background, borderRadius: RADIUS.md, gap: 5,
  },
  riskTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  riskCategory: { fontSize: FONTS.sizes.sm, fontWeight: FONTS.weights.bold, color: COLORS.text },
  riskBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: RADIUS.full, borderWidth: 1 },
  riskBadgeTxt: { fontSize: 8, fontWeight: FONTS.weights.bold, letterSpacing: 0.5 },
  riskDesc: { fontSize: FONTS.sizes.xs, color: COLORS.textDim, lineHeight: 16 },
  weakRow: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm },
  weakDot: { fontSize: 12, color: '#C97A6E', marginTop: 1 },
  weakTxt: { flex: 1, fontSize: FONTS.sizes.sm, color: COLORS.textDim, lineHeight: 20 },

  compRow: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.md },
  compRowBorder: { paddingTop: SPACING.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: COLORS.border },
  compTicker: {
    width: 52, height: 38, borderRadius: RADIUS.sm, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  compTickerTxt: { fontSize: FONTS.sizes.xs, fontWeight: FONTS.weights.heavy, letterSpacing: 0.5 },
  compInfo: { flex: 1, gap: 4 },
  compNameRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, flexWrap: 'wrap' },
  compName: { fontSize: FONTS.sizes.sm, fontWeight: FONTS.weights.bold, color: COLORS.text },
  threatBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: RADIUS.full, borderWidth: 1 },
  threatTxt: { fontSize: 7, fontWeight: FONTS.weights.bold, letterSpacing: 0.5 },
  compDetail: { fontSize: FONTS.sizes.xs, color: COLORS.textDim, lineHeight: 16 },
});

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.lg, gap: SPACING.lg },

  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    paddingLeft: SPACING.md,
  },
  searchInput: {
    flex: 1,
    fontSize: FONTS.sizes.sm,
    color: COLORS.text,
    paddingVertical: 13,
    letterSpacing: 0.3,
    outlineStyle: 'none' as any,
  },
  searchBtn: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: 13,
    backgroundColor: COLORS.text,
    borderTopRightRadius: RADIUS.xl,
    borderBottomRightRadius: RADIUS.xl,
  },
  searchBtnTxt: {
    fontSize: FONTS.sizes.sm,
    fontWeight: FONTS.weights.bold,
    color: COLORS.background,
    letterSpacing: 0.3,
  },

  quickRow: { flexDirection: 'row', gap: SPACING.sm },
  quickBtn: {
    flex: 1, paddingVertical: 8, alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.full,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
  },
  quickTxt: { fontSize: FONTS.sizes.xs, fontWeight: FONTS.weights.bold, color: COLORS.gold, letterSpacing: 1 },

  loadingCard: {
    padding: SPACING.xl,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.gold + '40',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  loadingTitle: { fontSize: FONTS.sizes.lg, fontWeight: FONTS.weights.bold, color: COLORS.text },
  loadingSub: { fontSize: FONTS.sizes.sm, color: COLORS.textMuted },
  loadingDots: { flexDirection: 'row', gap: 6, marginTop: SPACING.sm },
  loadingDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.gold },

  sectionHeader: { gap: 3 },
  sectionTitle: { fontSize: FONTS.sizes.lg, fontWeight: FONTS.weights.bold, color: COLORS.text, letterSpacing: -0.3 },
  sectionSub: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.md },

  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  quickGridBtn: {
    width: '48%',
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    padding: SPACING.md,
    gap: 4,
  },
  quickGridTicker: { fontSize: FONTS.sizes.lg, fontWeight: FONTS.weights.heavy, color: COLORS.text },
  quickGridLabel: { fontSize: FONTS.sizes.xs, color: COLORS.gold, letterSpacing: FONTS.tracking.wide },
});
