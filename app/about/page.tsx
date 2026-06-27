"use client";

import { motion } from "framer-motion";
import { PageHeader } from "@/components/ui/PageHeader";
import { BottomNav } from "@/components/ui/BottomNav";
import { Card } from "@/components/ui/Card";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import {
  Compass, Heart, Shield, Lightbulb, Users, Sparkles,
} from "lucide-react";


export default function AboutPage() {
  const { t } = useTranslation();

  const values = [
    { key: "valueInclusion" as const, descKey: "valueInclusionDesc" as const, icon: Users, accent: "text-blue-400", bg: "bg-blue-400/10" },
    { key: "valueSimplicity" as const, descKey: "valueSimplicityDesc" as const, icon: Lightbulb, accent: "text-gold", bg: "bg-gold/10" },
    { key: "valueEmpowerment" as const, descKey: "valueEmpowermentDesc" as const, icon: Sparkles, accent: "text-emerald", bg: "bg-emerald/10" },
    { key: "valuePrivacy" as const, descKey: "valuePrivacyDesc" as const, icon: Shield, accent: "text-purple-400", bg: "bg-purple-400/10" },
  ];

  return (
    <main className="mx-auto min-h-screen max-w-md px-5 pb-28 pt-8">
      <PageHeader title={t("aboutTitle")} subtitle={t("builtWith")} />

      {/* Hero with Bynance + Brand */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 flex flex-col items-center gap-4 rounded-2xl border border-gold/20 bg-bg-raised p-6 text-center shadow-glow"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/bynance.png"
          alt="Bynance mascot"
          className="h-24 w-24 object-contain drop-shadow-lg"
        />
        <div>
          <h2 className="font-display text-xl font-bold text-ink">Compass Finance</h2>
          <p className="mt-1 text-sm text-ink-muted">{t("appTagline")}</p>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-bg-hover px-3 py-1">
          <Compass size={14} className="text-gold" />
          <span className="text-xs font-mono text-ink-faint">{t("version")} 2.0.0</span>
        </div>
      </motion.div>

      {/* Mission */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-4"
      >
        <Card>
          <div className="flex items-center gap-2 mb-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gold/10">
              <Compass size={16} className="text-gold" />
            </div>
            <h3 className="font-display font-semibold text-ink">{t("missionTitle")}</h3>
          </div>
          <p className="text-sm leading-relaxed text-ink-muted">
            {t("missionText")}
          </p>
        </Card>
      </motion.section>

      {/* Vision */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="mb-6"
      >
        <Card>
          <div className="flex items-center gap-2 mb-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald/10">
              <Heart size={16} className="text-emerald" />
            </div>
            <h3 className="font-display font-semibold text-ink">{t("visionTitle")}</h3>
          </div>
          <p className="text-sm leading-relaxed text-ink-muted">
            {t("visionText")}
          </p>
        </Card>
      </motion.section>

      {/* Core Values */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <h3 className="mb-3 font-display font-semibold text-ink">{t("coreValues")}</h3>
        <div className="grid grid-cols-2 gap-3">
          {values.map((v, i) => {
            const Icon = v.icon;
            return (
              <motion.div
                key={v.key}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.25 + i * 0.05 }}
                className="rounded-xl border border-border-soft bg-bg-raised p-4"
              >
                <div className={`mb-2 flex h-10 w-10 items-center justify-center rounded-xl ${v.bg}`}>
                  <Icon size={18} className={v.accent} />
                </div>
                <p className="text-sm font-semibold text-ink">{t(v.key)}</p>
                <p className="mt-1 text-xs text-ink-muted leading-relaxed">{t(v.descKey)}</p>
              </motion.div>
            );
          })}
        </div>
      </motion.section>

      <BottomNav />
    </main>
  );
}
