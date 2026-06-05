import React from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { colors, radius, spacing, typography } from "../theme";
export function Logo() {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
      <Image source={require("../../assets/icon.png")} style={logoStyles.square} />
      <Text style={logoStyles.word}>kino</Text>
    </View>
  );
}

const logoStyles = StyleSheet.create({
  square: {
    width: 32,
    height: 32,
    borderRadius: 10,
  },
  word: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
});

export function Eyebrow({ children }: { children: string }) {
  return <Text style={s.eyebrow}>{children}</Text>;
}

export function H1({ children }: { children: string }) {
  return <Text style={s.h1}>{children}</Text>;
}

export function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active?: boolean;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      style={[s.chip, { minHeight: 44 }, active ? s.chipActive : null]}
    >
      <Text style={[s.chipText, active ? s.chipTextActive : null]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export function PrimaryButton({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      style={[s.btnPrimary, disabled ? { opacity: 0.6 } : null]}
    >
      <Text style={s.btnPrimaryText}>{label}</Text>
    </TouchableOpacity>
  );
}

export function GhostButton({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity accessibilityRole="button" accessibilityLabel={label} activeOpacity={0.85} onPress={onPress} style={s.btnGhost}>
      <Text style={s.btnGhostText}>{label}</Text>
    </TouchableOpacity>
  );
}

export function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: { label: string; onPress: () => void };
  children: React.ReactNode;
}) {
  return (
    <View style={{ marginBottom: spacing.xl }}>
      <View style={s.sectionHeader}>
        <Text style={s.sectionTitle}>{title}</Text>
        {action && (
          <TouchableOpacity onPress={action.onPress}>
            <Text style={s.sectionAction}>{action.label} â†’</Text>
          </TouchableOpacity>
        )}
      </View>
      {children}
    </View>
  );
}



export const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ink },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  adminIconBtn: {
    borderColor: colors.kino,
    backgroundColor: "rgba(255,46,126,0.12)",
  },
  avatarBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.kino,
    overflow: "hidden",
  },
  avatarImg: { width: 38, height: 38 },

  eyebrow: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 2,
    color: colors.kinoHot,
  },
  h1: { ...typography.h1, color: colors.text, marginTop: 4 },
  sub: { color: colors.muted, fontSize: 13, lineHeight: 18 },
  err: { color: "#f87171", marginBottom: 8 },
  label: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.5,
    marginBottom: 4,
    marginTop: 8,
    textTransform: "uppercase",
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "700",
  },
  sectionAction: { color: colors.kinoHot, fontSize: 13, fontWeight: "600" },

  card: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: 10,
    backgroundColor: colors.panelSoft,
  },

  hero: {
    height: 280,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    borderRadius: radius.xl,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panel,
  },
  heroOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(10,7,16,0.55)",
  },
  heroContent: { padding: spacing.lg },
  heroTitle: {
    color: colors.text,
    fontSize: 28,
    fontWeight: "800",
    marginTop: 4,
  },
  heroScore: { color: colors.gold, fontWeight: "700", marginTop: 6 },

  engagementRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  engBadge: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    alignItems: "center",
  },
  engValue: { color: "#fff", fontSize: 18, fontWeight: "800" },
  engLabel: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1.5,
    marginTop: 2,
  },

  tonightBanner: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.xl,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: "#22142c",
    borderWidth: 1,
    borderColor: "rgba(255,46,126,0.4)",
    overflow: "hidden",
  },
  tonightGlow: {
    position: "absolute",
    right: -40,
    top: -40,
    width: 160,
    height: 160,
    backgroundColor: colors.kino,
    opacity: 0.2,
    borderRadius: 999,
  },
  tonightTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "800",
    marginTop: 6,
  },
  tonightSub: { color: colors.muted, marginTop: 4 },

  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 6,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 999,
    backgroundColor: colors.kino,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#fff", fontWeight: "800", fontSize: 11 },

  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panelSoft,
  },
  chipActive: {
    borderColor: colors.kino,
    backgroundColor: "rgba(255,46,126,0.2)",
  },
  chipText: { color: colors.muted, fontSize: 12, fontWeight: "600" },
  chipTextActive: { color: colors.text },

  btnPrimary: {
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    borderRadius: radius.pill,
    backgroundColor: colors.kino,
    alignItems: "center",
    justifyContent: "center",
  },
  btnPrimaryText: { color: "#fff", fontWeight: "700" },
  btnGhost: {
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panelSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  btnGhostText: { color: colors.text, fontWeight: "600" },

  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
    color: colors.text,
    backgroundColor: "rgba(0,0,0,0.25)",
  },

  swipeCard: {
    flex: 1,
    borderRadius: radius.xl,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panel,
  },
  swipeOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(10,7,16,0.4)",
  },
  swipeBadge: {
    position: "absolute",
    top: 30,
    borderWidth: 3,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    transform: [{ rotate: "-8deg" }],
  },
  swipeBadgeText: { fontSize: 22, fontWeight: "800", letterSpacing: 2 },

  miniChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  miniChipText: { color: "#fff", fontSize: 11, fontWeight: "600" },

  emptyCard: {
    flex: 1,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.panelSoft,
  },

  tonightActions: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 18,
    paddingVertical: spacing.lg,
  },
  roundBtn: {
    width: 62,
    height: 62,
    borderRadius: 999,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  detailsPill: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panelSoft,
  },

  toast: {
    position: "absolute",
    bottom: 110,
    alignSelf: "center",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: radius.pill,
    borderWidth: 1,
    backgroundColor: colors.panel,
  },
});


export function Label({ children }: { children: string }) {
  return <Text style={s.label}>{children}</Text>;
}



