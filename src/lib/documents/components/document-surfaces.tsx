import type { ReactNode } from "react";
import { Image, StyleSheet, Text, View } from "@react-pdf/renderer";
import {
  colors,
  FONT_FAMILY,
  FONT_WEIGHTS,
  fontSize,
  lineHeight,
  spacing,
  tabularNums,
} from "./theme";

export interface SurfaceMetaItem {
  label: string;
  value: string;
}

export interface SurfaceCallout {
  eyebrow: string;
  title: string;
  detail?: string | null;
  tone?: "neutral" | "warning" | "success" | "info";
}

export interface DetailStripItem {
  label: string;
  value: string;
  weight?: number;
  emphasis?: "default" | "strong" | "subtle";
}

export interface SummaryCardRow {
  key: string;
  label: string;
  value: string;
  emphasized?: boolean;
}

type SurfaceVariant = "standard" | "formal" | "certificate";

const toneStyles = {
  neutral: {
    backgroundColor: colors.background.subtle,
    borderColor: colors.border.light,
    eyebrowColor: colors.text.secondary,
    titleColor: colors.text.primary,
  },
  warning: {
    backgroundColor: colors.status.warningLight,
    borderColor: colors.status.warning,
    eyebrowColor: colors.status.warning,
    titleColor: colors.text.primary,
  },
  success: {
    backgroundColor: colors.status.successLight,
    borderColor: colors.status.success,
    eyebrowColor: colors.status.success,
    titleColor: colors.text.primary,
  },
  info: {
    backgroundColor: colors.status.infoLight,
    borderColor: colors.status.info,
    eyebrowColor: colors.status.info,
    titleColor: colors.text.primary,
  },
} as const;

const styles = StyleSheet.create({
  masthead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: spacing.lg,
  },
  mastheadFormal: {
    marginBottom: spacing.md,
  },
  mastheadCertificate: {
    display: "flex",
    flexDirection: "column",
    alignItems: "stretch",
    paddingTop: spacing.lg,
    marginBottom: spacing.xl,
  },
  mastheadMain: {
    flex: 1,
    marginRight: spacing.lg,
  },
  mastheadMainCertificate: {
    marginRight: 0,
    flexGrow: 0,
    flexShrink: 0,
    width: "100%",
  },
  mastheadTitle: {
    fontSize: fontSize["3xl"],
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.semibold,
    color: colors.text.primary,
    lineHeight: lineHeight.tight,
    marginBottom: spacing.sm,
  },
  mastheadSubtitle: {
    fontSize: fontSize.md,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.regular,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  mastheadTitleCertificate: {
    textAlign: "center",
    fontSize: fontSize["3xl"],
    marginBottom: spacing.xs,
  },
  mastheadSubtitleCertificate: {
    textAlign: "center",
    fontSize: fontSize.lg,
    marginBottom: spacing.sm,
  },
  metaStack: {
    marginTop: spacing.xs,
  },
  metaStackCertificate: {
    alignSelf: "center",
    width: "74%",
    borderTopWidth: 0.75,
    borderTopColor: colors.border.light,
    paddingTop: spacing.sm,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: spacing.xs,
  },
  metaRowCertificate: {
    justifyContent: "center",
  },
  metaLabel: {
    width: 88,
    fontSize: fontSize.xs,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.medium,
    color: colors.text.muted,
    textTransform: "uppercase",
  },
  metaLabelCertificate: {
    width: 96,
    color: colors.text.secondary,
  },
  metaValue: {
    flex: 1,
    fontSize: fontSize.sm,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.medium,
    color: colors.text.primary,
    lineHeight: lineHeight.normal,
  },
  metaValueCertificate: {
    flex: 0,
    minWidth: 132,
    marginLeft: spacing.sm,
  },
  mastheadSide: {
    width: 196,
    alignItems: "stretch",
  },
  mastheadSideFormal: {
    width: 180,
  },
  logoWrap: {
    alignItems: "flex-end",
    marginBottom: spacing.xs,
  },
  logo: {
    height: 34,
    objectFit: "contain",
    maxWidth: 140,
  },
  logoWrapCertificate: {
    alignItems: "center",
    marginBottom: spacing.md,
  },
  logoCertificate: {
    height: 40,
    objectFit: "contain",
    maxWidth: 180,
  },
  callout: {
    borderWidth: 0.75,
    padding: 10,
  },
  calloutFormal: {
    borderWidth: 0.75,
    backgroundColor: colors.background.white,
    borderColor: colors.border.medium,
    borderTopWidth: 1,
    paddingTop: spacing.sm,
    padding: 10,
  },
  calloutCertificate: {
    alignSelf: "center",
    width: "74%",
    borderWidth: 0.75,
    backgroundColor: colors.background.white,
    borderColor: colors.border.medium,
    borderTopWidth: 1,
    marginTop: spacing.lg,
    padding: 10,
  },
  calloutEyebrow: {
    fontSize: fontSize.xs,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.semibold,
    textTransform: "uppercase",
    marginBottom: spacing.xs,
  },
  calloutTitle: {
    fontSize: fontSize.xl,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.semibold,
    lineHeight: lineHeight.tight,
    marginBottom: spacing.xs,
  },
  calloutDetail: {
    fontSize: fontSize.sm,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.regular,
    color: colors.text.secondary,
    lineHeight: lineHeight.relaxed,
  },
  calloutDetailCertificate: {
    textAlign: "center",
  },
  calloutTitleCertificate: {
    textAlign: "center",
  },
  panelGrid: {
    flexDirection: "row",
    marginBottom: spacing.lg,
  },
  panelCol: {
    flex: 1,
  },
  panelColLeft: {
    marginRight: spacing.md,
  },
  panelColRight: {
    marginLeft: spacing.md,
  },
  panel: {
    borderWidth: 0.75,
    borderColor: colors.border.light,
    backgroundColor: colors.background.white,
    padding: 10,
  },
  panelFormal: {
    backgroundColor: colors.background.white,
    borderTopWidth: 0.75,
    borderTopColor: colors.border.medium,
    paddingHorizontal: 0,
    paddingTop: spacing.sm,
    paddingBottom: 0,
  },
  panelLabel: {
    fontSize: fontSize.xs,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.semibold,
    color: colors.text.muted,
    textTransform: "uppercase",
    marginBottom: spacing.sm,
  },
  panelLabelFormal: {
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  panelName: {
    fontSize: fontSize.base,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.semibold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  panelNameFormal: {
    fontSize: fontSize.sm,
  },
  panelText: {
    fontSize: fontSize.sm,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.regular,
    color: colors.text.secondary,
    lineHeight: lineHeight.relaxed,
    marginBottom: 2,
  },
  panelTextFormal: {
    color: colors.text.primary,
  },
  panelMutedText: {
    fontSize: fontSize.xs,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.regular,
    color: colors.text.muted,
    lineHeight: lineHeight.relaxed,
    marginBottom: 2,
  },
  detailStrip: {
    flexDirection: "row",
    marginBottom: spacing.lg,
  },
  detailStripFormal: {
    flexDirection: "row",
    borderTopWidth: 0.75,
    borderBottomWidth: 0.75,
    borderColor: colors.border.medium,
    paddingVertical: spacing.sm,
    marginBottom: spacing.lg,
  },
  detailItem: {
    flex: 1,
    borderWidth: 0.75,
    borderColor: colors.border.light,
    backgroundColor: colors.background.card,
    padding: 10,
    marginRight: spacing.sm,
  },
  detailItemFormal: {
    backgroundColor: colors.background.white,
    borderRightWidth: 0.75,
    borderRightColor: colors.border.light,
    paddingVertical: 0,
    paddingHorizontal: spacing.sm,
    marginRight: 0,
  },
  detailItemFormalLast: {
    borderRightWidth: 0,
  },
  detailItemLast: {
    marginRight: 0,
  },
  detailItemStrong: {
    borderColor: colors.border.medium,
    backgroundColor: colors.background.white,
  },
  detailItemSubtle: {
    backgroundColor: colors.background.subtle,
  },
  detailLabel: {
    fontSize: fontSize.xs,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.medium,
    color: colors.text.muted,
    textTransform: "uppercase",
    marginBottom: spacing.xs,
  },
  detailValue: {
    fontSize: fontSize.md,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.semibold,
    color: colors.text.primary,
    lineHeight: lineHeight.normal,
  },
  detailValueStrong: {
    fontSize: fontSize.lg,
  },
  splitRow: {
    flexDirection: "row",
    marginTop: spacing.md,
  },
  splitCol: {
    flex: 1,
  },
  splitColLeft: {
    marginRight: spacing.md,
  },
  splitColRight: {
    marginLeft: spacing.md,
  },
  summaryCard: {
    borderWidth: 0.75,
    borderColor: colors.border.light,
    backgroundColor: colors.background.card,
    padding: 10,
  },
  summaryCardFormal: {
    backgroundColor: colors.background.white,
    borderTopWidth: 0.75,
    borderBottomWidth: 0.75,
    borderColor: colors.border.medium,
    paddingHorizontal: 0,
    paddingVertical: spacing.sm,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: spacing.sm,
  },
  summaryRowFormal: {
    marginBottom: spacing.xs,
  },
  summaryLabel: {
    flex: 1,
    fontSize: fontSize.sm,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.regular,
    color: colors.text.secondary,
    marginRight: spacing.md,
  },
  summaryLabelFormal: {
    color: colors.text.primary,
  },
  summaryValue: {
    fontSize: fontSize.sm,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.semibold,
    color: colors.text.primary,
    textAlign: "right",
    ...tabularNums,
  },
  summaryRowEmphasized: {
    borderTopWidth: 0.75,
    borderTopColor: colors.border.medium,
    paddingTop: spacing.md,
    marginTop: spacing.sm,
    marginBottom: 0,
  },
  summaryRowEmphasizedFormal: {
    borderTopColor: colors.border.medium,
    paddingTop: spacing.sm,
    marginTop: spacing.sm,
  },
  summaryLabelEmphasized: {
    fontSize: fontSize.md,
    fontWeight: FONT_WEIGHTS.semibold,
    color: colors.text.primary,
  },
  summaryValueEmphasized: {
    fontSize: fontSize["2xl"],
    fontWeight: FONT_WEIGHTS.bold,
  },
  sectionCard: {
    borderWidth: 0.75,
    borderColor: colors.border.light,
    padding: 10,
    backgroundColor: colors.background.white,
    marginBottom: spacing.md,
  },
  sectionCardFormal: {
    backgroundColor: colors.background.white,
    borderTopWidth: 0.75,
    borderTopColor: colors.border.medium,
    paddingHorizontal: 0,
    paddingTop: spacing.sm,
    paddingBottom: 0,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.sm,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.semibold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  sectionTitleFormal: {
    marginBottom: spacing.xs,
  },
  sectionBody: {
    fontSize: fontSize.sm,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.regular,
    color: colors.text.secondary,
    lineHeight: lineHeight.relaxed,
  },
  bulletRow: {
    flexDirection: "row",
    marginBottom: spacing.xs,
  },
  bullet: {
    width: 10,
    fontSize: fontSize.sm,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.regular,
    color: colors.text.primary,
  },
  bulletText: {
    flex: 1,
    fontSize: fontSize.sm,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.regular,
    color: colors.text.primary,
    lineHeight: lineHeight.relaxed,
  },
});

export function DocumentMasthead({
  title,
  subtitle,
  meta,
  callout,
  logoUrl,
  variant = "standard",
}: {
  title: string;
  subtitle?: string | null;
  meta: SurfaceMetaItem[];
  callout?: SurfaceCallout | null;
  logoUrl?: string | null;
  variant?: SurfaceVariant;
}) {
  const tone = toneStyles[callout?.tone ?? "neutral"];

  if (variant === "certificate") {
    return (
      <View style={[styles.masthead, styles.mastheadCertificate]}>
        {logoUrl ? (
          <View style={[styles.logoWrap, styles.logoWrapCertificate]}>
            <Image src={logoUrl} style={[styles.logo, styles.logoCertificate]} />
          </View>
        ) : null}

        <View style={styles.mastheadMainCertificate}>
          <Text style={[styles.mastheadTitle, styles.mastheadTitleCertificate]}>{title}</Text>
          {subtitle ? (
            <Text style={[styles.mastheadSubtitle, styles.mastheadSubtitleCertificate]}>
              {subtitle}
            </Text>
          ) : null}
          <View style={[styles.metaStack, styles.metaStackCertificate]}>
            {meta.map((item, index) => (
              <View key={`${item.label}-${index}`} style={[styles.metaRow, styles.metaRowCertificate]}>
                <Text style={[styles.metaLabel, styles.metaLabelCertificate]}>{item.label}</Text>
                <Text style={[styles.metaValue, styles.metaValueCertificate]}>{item.value}</Text>
              </View>
            ))}
          </View>
        </View>

        {callout ? (
          <View style={[styles.callout, styles.calloutCertificate]}>
            <Text style={[styles.calloutEyebrow, { color: tone.eyebrowColor, textAlign: "center" }]}>
              {callout.eyebrow}
            </Text>
            <Text style={[styles.calloutTitle, styles.calloutTitleCertificate]}>
              {callout.title}
            </Text>
            {callout.detail ? (
              <Text style={[styles.calloutDetail, styles.calloutDetailCertificate]}>
                {callout.detail}
              </Text>
            ) : null}
          </View>
        ) : null}
      </View>
    );
  }

  return (
    <View style={variant === "formal" ? [styles.masthead, styles.mastheadFormal] : styles.masthead}>
      <View style={styles.mastheadMain}>
        <Text style={styles.mastheadTitle}>{title}</Text>
        {subtitle ? <Text style={styles.mastheadSubtitle}>{subtitle}</Text> : null}
        <View style={styles.metaStack}>
          {meta.map((item, index) => (
            <View key={`${item.label}-${index}`} style={styles.metaRow}>
              <Text style={styles.metaLabel}>{item.label}</Text>
              <Text style={styles.metaValue}>{item.value}</Text>
            </View>
          ))}
        </View>
      </View>

      {(logoUrl || callout) ? (
        <View
          style={variant === "formal" ? [styles.mastheadSide, styles.mastheadSideFormal] : styles.mastheadSide}
        >
          {logoUrl ? (
            <View style={styles.logoWrap}>
              <Image src={logoUrl} style={styles.logo} />
            </View>
          ) : null}
          {callout ? (
            <View
              style={
                variant === "formal"
                  ? styles.calloutFormal
                  : [
                      styles.callout,
                      {
                        backgroundColor: tone.backgroundColor,
                        borderColor: tone.borderColor,
                      },
                    ]
              }
            >
              <Text style={[styles.calloutEyebrow, { color: tone.eyebrowColor }]}>
                {callout.eyebrow}
              </Text>
              <Text style={[styles.calloutTitle, { color: tone.titleColor }]}>
                {callout.title}
              </Text>
              {callout.detail ? (
                <Text style={styles.calloutDetail}>{callout.detail}</Text>
              ) : null}
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

export function DocumentPanelGrid({
  left,
  right,
}: {
  left: ReactNode;
  right: ReactNode;
}) {
  return (
    <View style={styles.panelGrid}>
      <View style={[styles.panelCol, styles.panelColLeft]}>{left}</View>
      <View style={[styles.panelCol, styles.panelColRight]}>{right}</View>
    </View>
  );
}

export function DocumentInfoPanel({
  label,
  name,
  lines,
  mutedLines,
  variant = "standard",
}: {
  label: string;
  name?: string | null;
  lines: string[];
  mutedLines?: string[];
  variant?: Exclude<SurfaceVariant, "certificate">;
}) {
  return (
    <View style={variant === "formal" ? styles.panelFormal : styles.panel}>
      <Text style={variant === "formal" ? [styles.panelLabel, styles.panelLabelFormal] : styles.panelLabel}>
        {label}
      </Text>
      {name ? (
        <Text style={variant === "formal" ? [styles.panelName, styles.panelNameFormal] : styles.panelName}>
          {name}
        </Text>
      ) : null}
      {lines.length > 0 ? (
        lines.map((line, index) => (
          <Text
            key={`${label}-line-${index}`}
            style={variant === "formal" ? [styles.panelText, styles.panelTextFormal] : styles.panelText}
          >
            {line}
          </Text>
        ))
      ) : (
        <Text style={variant === "formal" ? [styles.panelText, styles.panelTextFormal] : styles.panelText}>—</Text>
      )}
      {mutedLines?.map((line, index) => (
        <Text key={`${label}-muted-${index}`} style={styles.panelMutedText}>
          {line}
        </Text>
      ))}
    </View>
  );
}

export function DocumentDetailStrip({
  items,
  variant = "standard",
}: {
  items: DetailStripItem[];
  variant?: Exclude<SurfaceVariant, "certificate">;
}) {
  if (items.length === 0) {
    return null;
  }

  return (
    <View style={variant === "formal" ? styles.detailStripFormal : styles.detailStrip}>
      {items.map((item, index) => {
        const itemStyles = [
          variant === "formal" ? styles.detailItemFormal : styles.detailItem,
          { flex: item.weight ?? 1 },
          ...(item.emphasis === "strong" ? [styles.detailItemStrong] : []),
          ...(item.emphasis === "subtle" ? [styles.detailItemSubtle] : []),
          ...(variant === "formal" && index === items.length - 1 ? [styles.detailItemFormalLast] : []),
          ...(index === items.length - 1 ? [styles.detailItemLast] : []),
        ];

        return (
        <View
          key={`${item.label}-${index}`}
          style={itemStyles}
        >
          <Text style={styles.detailLabel}>{item.label}</Text>
          <Text
            style={item.emphasis === "strong" ? [styles.detailValue, styles.detailValueStrong] : styles.detailValue}
          >
            {item.value}
          </Text>
        </View>
        );
      })}
    </View>
  );
}

export function DocumentSplitRow({
  left,
  right,
}: {
  left: ReactNode;
  right: ReactNode;
}) {
  return (
    <View style={styles.splitRow}>
      <View style={[styles.splitCol, styles.splitColLeft]}>{left}</View>
      <View style={[styles.splitCol, styles.splitColRight]}>{right}</View>
    </View>
  );
}

export function DocumentSummaryCard({
  rows,
  variant = "standard",
}: {
  rows: SummaryCardRow[];
  variant?: Exclude<SurfaceVariant, "certificate">;
}) {
  return (
    <View style={variant === "formal" ? styles.summaryCardFormal : styles.summaryCard}>
      {rows.map((row) => (
        <View
          key={row.key}
          style={
            row.emphasized
              ? [
                  styles.summaryRow,
                  ...(variant === "formal" ? [styles.summaryRowFormal] : []),
                  styles.summaryRowEmphasized,
                  ...(variant === "formal" ? [styles.summaryRowEmphasizedFormal] : []),
                ]
              : [styles.summaryRow, ...(variant === "formal" ? [styles.summaryRowFormal] : [])]
          }
        >
          <Text
            style={
              row.emphasized
                ? [
                    styles.summaryLabel,
                    ...(variant === "formal" ? [styles.summaryLabelFormal] : []),
                    styles.summaryLabelEmphasized,
                  ]
                : [styles.summaryLabel, ...(variant === "formal" ? [styles.summaryLabelFormal] : [])]
            }
          >
            {row.label}
          </Text>
          <Text
            style={row.emphasized ? [styles.summaryValue, styles.summaryValueEmphasized] : styles.summaryValue}
          >
            {row.value}
          </Text>
        </View>
      ))}
    </View>
  );
}

export function DocumentSectionCard({
  title,
  children,
  variant = "standard",
}: {
  title: string;
  children: ReactNode;
  variant?: Exclude<SurfaceVariant, "certificate">;
}) {
  return (
    <View style={variant === "formal" ? styles.sectionCardFormal : styles.sectionCard}>
      <Text style={variant === "formal" ? [styles.sectionTitle, styles.sectionTitleFormal] : styles.sectionTitle}>
        {title}
      </Text>
      <View>{children}</View>
    </View>
  );
}

export function DocumentBodyText({ children }: { children: ReactNode }) {
  return <Text style={styles.sectionBody}>{children}</Text>;
}

export function DocumentBulletList({ items }: { items: string[] }) {
  return (
    <View>
      {items.map((item, index) => (
        <View key={`${item}-${index}`} style={styles.bulletRow}>
          <Text style={styles.bullet}>•</Text>
          <Text style={styles.bulletText}>{item}</Text>
        </View>
      ))}
    </View>
  );
}
