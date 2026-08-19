import { useEffect, useMemo, useState } from "react"
import {
  ArrowLeft,
  Award,
  BookOpen,
  Calendar,
  Download,
  Printer,
  RotateCcw,
  Search,
  Sparkles,
  X,
  Layers,
} from "lucide-react"
import { getAllMemoriesForChild, getAllTargetsForChild } from "./db"
import { useLocale } from "./i18n"
import { AUDIO_SURAHS, rangeLabel, surahFor } from "./surahData"
import { exportReportToCsv, triggerPrintReport } from "./utils/exportReport"

export default function ReportPage({ family, back, onStartReview }) {
  const { t } = useLocale()

  const activeChild = useMemo(() => {
    return family?.children?.find((child) => child.id === family.activeChildId) || family?.children?.[0] || null
  }, [family])

  const [memories, setMemories] = useState([])
  const [targets, setTargets] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [timeFilter, setTimeFilter] = useState("all")
  const [selectedSurahId, setSelectedSurahId] = useState(null)
  const [selectedJuz, setSelectedJuz] = useState("30")

  useEffect(() => {
    if (!activeChild?.id) {
      setMemories([])
      setTargets([])
      setIsLoading(false)
      return
    }

    let isMounted = true
    setIsLoading(true)

    Promise.all([
      getAllMemoriesForChild(activeChild.id),
      getAllTargetsForChild(activeChild.id),
    ]).then(([memList, targetList]) => {
      if (isMounted) {
        setMemories(memList)
        setTargets(targetList)
        setIsLoading(false)
      }
    }).catch(() => {
      if (isMounted) setIsLoading(false)
    })

    return () => { isMounted = false }
  }, [activeChild])

  const activeJuzSurahs = useMemo(() => {
    if (selectedJuz === "30") {
      return AUDIO_SURAHS.filter((surah) => surah.group === "juz30" || surah.id === "1")
    }
    if (selectedJuz === "29") {
      return AUDIO_SURAHS.filter((surah) => surah.group === "juz29")
    }
    if (selectedJuz === "28") {
      return AUDIO_SURAHS.filter((surah) => surah.group === "juz28")
    }
    return AUDIO_SURAHS
  }, [selectedJuz])

  const memoryMapBySurah = useMemo(() => {
    const map = new Map()
    memories.forEach((mem) => {
      const existing = map.get(mem.surahId) || []
      existing.push(mem)
      map.set(mem.surahId, existing)
    })
    return map
  }, [memories])

  const stats = useMemo(() => {
    const totalMemories = memories.length
    let totalAyat = 0
    let mutqinCount = 0

    memories.forEach((mem) => {
      const count = Math.max(1, (mem.endAyah - mem.startAyah + 1))
      totalAyat += count
      const isOverdue = mem.nextReviewAt && new Date(mem.nextReviewAt) < new Date()
      if (mem.status === "mutqin" || !isOverdue) mutqinCount++
    })

    const mutqinRate = totalMemories > 0 ? Math.round((mutqinCount / totalMemories) * 100) : 0

    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()

    const activeDaysSet = new Set()
    targets.forEach((target) => {
      if (target.createdAt) {
        const d = new Date(target.createdAt)
        if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
          activeDaysSet.add(d.toISOString().slice(0, 10))
        }
      }
    })

    return {
      totalMemories,
      totalAyat,
      mutqinRate,
      activeDaysThisMonth: activeDaysSet.size,
    }
  }, [memories, targets])

  const filteredMemories = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    const now = new Date()

    return memories.filter((mem) => {
      const surah = surahFor(mem.surahId)
      const surahName = surah ? surah.name.toLowerCase() : ""
      const surahNumber = String(mem.surahId)

      if (query && !surahName.includes(query) && !surahNumber.includes(query)) {
        return false
      }

      if (selectedSurahId && String(mem.surahId) !== String(selectedSurahId)) {
        return false
      }

      const isOverdue = mem.nextReviewAt && new Date(mem.nextReviewAt) < now
      const isMutqin = mem.status === "mutqin" || !isOverdue

      if (statusFilter === "mutqin" && !isMutqin) return false
      if (statusFilter === "review" && isMutqin) return false

      if (timeFilter !== "all" && mem.createdAt) {
        const created = new Date(mem.createdAt)
        const diffDays = (now.getTime() - created.getTime()) / (1000 * 3600 * 24)

        if (timeFilter === "7days" && diffDays > 7) return false
        if (timeFilter === "30days" && diffDays > 30) return false
        if (timeFilter === "month") {
          if (created.getMonth() !== now.getMonth() || created.getFullYear() !== now.getFullYear()) {
            return false
          }
        }
      }

      return true
    })
  }, [memories, searchQuery, statusFilter, timeFilter, selectedSurahId])

  const timelineGroups = useMemo(() => {
    const today = new Date().toDateString()
    const yesterday = new Date(Date.now() - 86400000).toDateString()

    const groups = {
      today: [],
      yesterday: [],
      thisWeek: [],
      earlier: [],
    }

    const now = new Date()

    filteredMemories.forEach((mem) => {
      const created = mem.createdAt ? new Date(mem.createdAt) : null
      if (!created) {
        groups.earlier.push(mem)
        return
      }

      const dateStr = created.toDateString()
      const diffDays = (now.getTime() - created.getTime()) / (1000 * 3600 * 24)

      if (dateStr === today) groups.today.push(mem)
      else if (dateStr === yesterday) groups.yesterday.push(mem)
      else if (diffDays <= 7) groups.thisWeek.push(mem)
      else groups.earlier.push(mem)
    })

    return groups
  }, [filteredMemories])

  const handleExportCsv = () => {
    exportReportToCsv({
      child: activeChild,
      memories,
      getSurahName: (surahId) => {
        const surah = surahFor(surahId)
        return surah ? `QS. ${surah.name}` : `QS. ${surahId}`
      },
    })
  }

  return (
    <main className="page-root min-h-screen pb-28 pt-4 sm:pt-6">
      <style>{`
        @media print {
          body { background: white !important; color: black !important; }
          .print\\:hidden { display: none !important; }
          .print\\:block { display: block !important; }
          .page-root { padding: 0 !important; }
          .glass-card { box-shadow: none !important; border: 1px solid #ddd !important; }
        }
      `}</style>

      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-sage/60 pb-5 dark:border-emerald-950/70 print:hidden">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={back}
              className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-forest shadow-sm transition-transform active:scale-95 dark:bg-surface dark:text-emerald-100"
              aria-label={t("report.back")}
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <span className="step-label bg-peach text-terracotta">
                {t("report.headerBadge")}
              </span>
              <h1 className="font-display mt-1 text-2xl text-forest dark:text-emerald-100 sm:text-3xl">
                {t("report.title")}
              </h1>
            </div>
          </div>

          <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:items-center">
            <button
              type="button"
              onClick={triggerPrintReport}
              className="primary-button flex items-center justify-center gap-2 !px-4 !py-2.5 text-xs sm:text-sm active:scale-[0.96] transition-transform"
            >
              <Printer size={17} />
              <span>{t("report.exportPdfShort")}</span>
            </button>

            <button
              type="button"
              onClick={handleExportCsv}
              className="secondary-button flex items-center justify-center gap-2 !px-4 !py-2.5 text-xs sm:text-sm active:scale-[0.96] transition-transform"
            >
              <Download size={17} />
              <span>{t("report.exportCsvShort")}</span>
            </button>
          </div>
        </header>

        <section className="mt-6 rounded-3xl bg-forest p-6 text-white shadow-xl dark:bg-emerald-950/80 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 text-2xl shadow-sm">
                  {activeChild?.icon || "🌙"}
                </span>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-white/70">Wali Tahfiz</p>
                  <h2 className="font-display text-2xl text-white sm:text-3xl">
                    {activeChild?.name || "Anak"}
                  </h2>
                </div>
              </div>
              <p className="mt-2 text-sm text-white/80">
                {t("report.subtitle", { name: activeChild?.name || "Anak" })}
              </p>
            </div>

            <div className="rounded-2xl bg-white/10 px-4 py-2.5 text-right backdrop-blur-sm">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-white/90">
                {t("report.printGeneratedAt", { date: new Date().toLocaleDateString("id-ID") })}
                {activeChild?.age ? ` • ${activeChild.age} tahun` : ""}
              </span>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-2xl bg-white/10 p-4 backdrop-blur-sm">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-white/75">
                <BookOpen size={15} className="text-peach" /> {t("report.kpiTotalMemories")}
              </p>
              <p className="mt-2 font-display text-2xl font-bold tabular-nums text-white sm:text-3xl">
                {stats.totalMemories}
              </p>
              {stats.totalMemories === 0 && (
                <small className="block mt-0.5 text-[10px] text-white/60 font-normal">Belum ada setoran</small>
              )}
            </div>

            <div className="rounded-2xl bg-white/10 p-4 backdrop-blur-sm">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-white/75">
                <Sparkles size={15} className="text-peach" /> {t("report.kpiTotalAyat")}
              </p>
              <p className="mt-2 font-display text-2xl font-bold tabular-nums text-white sm:text-3xl">
                {stats.totalAyat}
              </p>
              {stats.totalAyat === 0 && (
                <small className="block mt-0.5 text-[10px] text-white/60 font-normal">Siap mulai</small>
              )}
            </div>

            <div className="rounded-2xl bg-white/10 p-4 backdrop-blur-sm">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-white/75">
                <Award size={15} className="text-peach" /> {t("report.kpiMutqinRate")}
              </p>
              <p className="mt-2 font-display text-2xl font-bold tabular-nums text-white sm:text-3xl">
                {stats.mutqinRate}%
              </p>
              {stats.totalMemories === 0 && (
                <small className="block mt-0.5 text-[10px] text-white/60 font-normal">Siap evaluasi</small>
              )}
            </div>

            <div className="rounded-2xl bg-white/10 p-4 backdrop-blur-sm">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-white/75">
                <Calendar size={15} className="text-peach" /> {t("report.kpiActiveDays")}
              </p>
              <p className="mt-2 font-display text-2xl font-bold tabular-nums text-white sm:text-3xl">
                {stats.activeDaysThisMonth} <span className="text-xs font-normal">hari</span>
              </p>
              {stats.activeDaysThisMonth === 0 && (
                <small className="block mt-0.5 text-[10px] text-white/60 font-normal">Bulan ini</small>
              )}
            </div>
          </div>
        </section>

        <section className="mt-8 rounded-3xl bg-white p-5 shadow-sm dark:bg-surface print:hidden sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="font-display text-lg text-forest dark:text-emerald-100 sm:text-xl">
                {t("report.surahProgressMap")}
              </h3>
              <p className="mt-0.5 text-xs text-stone-500 dark:text-stone-400">
                {t("report.surahMapSubtitle")}
              </p>
            </div>

            {selectedSurahId && (
              <button
                type="button"
                onClick={() => setSelectedSurahId(null)}
                className="flex items-center gap-1 text-xs font-bold text-terracotta hover:underline active:scale-95 transition-transform"
              >
                <X size={14} /> Reset Filter Surah
              </button>
            )}
          </div>

          {/* Juz Selection Tabs */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-b border-sage/60 pb-3 dark:border-emerald-950/60">
            <div className="flex items-center gap-1.5 rounded-2xl bg-surface-raised p-1 dark:bg-emerald-950/60">
              <button
                type="button"
                onClick={() => { setSelectedJuz("30"); setSelectedSurahId(null) }}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all active:scale-95 ${
                  selectedJuz === "30"
                    ? "bg-forest text-white shadow-sm dark:bg-emerald-700"
                    : "text-stone-600 hover:text-stone-900 dark:text-stone-300"
                }`}
              >
                {t("report.juzTab30")}
              </button>

              <button
                type="button"
                onClick={() => { setSelectedJuz("29"); setSelectedSurahId(null) }}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all active:scale-95 ${
                  selectedJuz === "29"
                    ? "bg-forest text-white shadow-sm dark:bg-emerald-700"
                    : "text-stone-600 hover:text-stone-900 dark:text-stone-300"
                }`}
              >
                {t("report.juzTab29")}
              </button>

              <button
                type="button"
                onClick={() => { setSelectedJuz("28"); setSelectedSurahId(null) }}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all active:scale-95 ${
                  selectedJuz === "28"
                    ? "bg-forest text-white shadow-sm dark:bg-emerald-700"
                    : "text-stone-600 hover:text-stone-900 dark:text-stone-300"
                }`}
              >
                {t("report.juzTab28")}
              </button>
            </div>

            {/* Visual Legend Bar */}
            <div className="flex items-center gap-3 text-[11px] font-semibold text-stone-600 dark:text-stone-400">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                {t("report.mapLegendMutqin")}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                {t("report.mapLegendReview")}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full border border-stone-300 bg-white dark:border-stone-700 dark:bg-stone-800" />
                {t("report.mapLegendEmpty")}
              </span>
            </div>
          </div>

          {/* Surah Map Cards */}
          {activeJuzSurahs.length > 0 ? (
            <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
              {activeJuzSurahs.map((surah) => {
                const surahMems = memoryMapBySurah.get(surah.id) || []
                const hasMemory = surahMems.length > 0
                const isMutqin = hasMemory && surahMems.every((m) => m.status === "mutqin" || !m.nextReviewAt || new Date(m.nextReviewAt) > new Date())
                const isSelected = String(selectedSurahId) === String(surah.id)

                let tileClass = "border-stone-200 bg-white text-stone-700 hover:bg-stone-50 dark:border-stone-800 dark:bg-surface dark:text-stone-300 dark:hover:bg-emerald-950/40"
                if (hasMemory && isMutqin) {
                  tileClass = "border-emerald-500 bg-emerald-50 text-emerald-950 dark:border-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-100"
                } else if (hasMemory) {
                  tileClass = "border-amber-400 bg-amber-50 text-amber-950 dark:border-amber-600 dark:bg-amber-950/50 dark:text-amber-100"
                }

                return (
                  <button
                    type="button"
                    key={surah.id}
                    onClick={() => setSelectedSurahId(isSelected ? null : surah.id)}
                    className={`flex flex-col items-start rounded-2xl border p-2.5 text-left transition-all active:scale-[0.96] ${tileClass} ${isSelected ? "ring-2 ring-forest dark:ring-emerald-400 shadow-md" : ""}`}
                  >
                    <div className="flex w-full items-center justify-between">
                      <span className="text-xs font-bold tabular-nums text-forest/75 dark:text-emerald-300">
                        {surah.id}
                      </span>
                      {hasMemory && (
                        <span className={`h-2.5 w-2.5 rounded-full ${isMutqin ? "bg-emerald-500" : "bg-amber-500"}`} />
                      )}
                    </div>
                    <b className="mt-1 truncate text-xs font-bold text-stone-900 dark:text-stone-100">
                      {surah.name}
                    </b>
                    <span className="text-[10px] tabular-nums text-stone-500 dark:text-stone-400">
                      {surah.ayat} ayat
                    </span>
                  </button>
                )
              })}
            </div>
          ) : (
            <div className="mt-4 flex flex-col items-center justify-center rounded-2xl border border-dashed border-sage p-8 text-center dark:border-emerald-900/60">
              <Layers className="h-10 w-10 text-emerald-600/60 dark:text-emerald-400/60" />
              <h4 className="font-display mt-3 text-base font-bold text-forest dark:text-emerald-200">
                {t("report.juzComingSoonTitle", { juz: selectedJuz })}
              </h4>
              <p className="mt-1 max-w-md text-xs leading-relaxed text-stone-500 dark:text-stone-400">
                {t("report.juzComingSoonDesc", { juz: selectedJuz })}
              </p>
            </div>
          )}
        </section>

        <section className="mt-8 print:hidden">
          <div className="flex flex-col gap-4 rounded-3xl bg-white p-5 shadow-sm dark:bg-surface lg:flex-row lg:items-center lg:justify-between">
            <div className="relative flex-1 min-w-0 lg:min-w-[240px]">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t("report.searchPlaceholder")}
                className="input-field pl-10 text-sm"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex rounded-2xl bg-surface-raised p-1 dark:bg-emerald-950/60">
                <button
                  type="button"
                  onClick={() => setStatusFilter("all")}
                  className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all active:scale-[0.96] ${statusFilter === "all" ? "bg-white text-forest shadow-sm dark:bg-surface dark:text-emerald-100" : "text-stone-500 dark:text-stone-400"}`}
                >
                  {t("report.allStatus")}
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter("mutqin")}
                  className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all active:scale-[0.96] ${statusFilter === "mutqin" ? "bg-white text-emerald-700 shadow-sm dark:bg-surface dark:text-emerald-300" : "text-stone-500 dark:text-stone-400"}`}
                >
                  {t("report.mutqin")}
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter("review")}
                  className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all active:scale-[0.96] ${statusFilter === "review" ? "bg-white text-amber-700 shadow-sm dark:bg-surface dark:text-amber-300" : "text-stone-500 dark:text-stone-400"}`}
                >
                  {t("report.needReview")}
                </button>
              </div>

              <div className="flex rounded-2xl bg-surface-raised p-1 dark:bg-emerald-950/60">
                <button
                  type="button"
                  onClick={() => setTimeFilter("all")}
                  className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all active:scale-[0.96] ${timeFilter === "all" ? "bg-white text-forest shadow-sm dark:bg-surface dark:text-emerald-100" : "text-stone-500 dark:text-stone-400"}`}
                >
                  {t("report.timeAll")}
                </button>
                <button
                  type="button"
                  onClick={() => setTimeFilter("7days")}
                  className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all active:scale-[0.96] ${timeFilter === "7days" ? "bg-white text-forest shadow-sm dark:bg-surface dark:text-emerald-100" : "text-stone-500 dark:text-stone-400"}`}
                >
                  {t("report.time7Days")}
                </button>
                <button
                  type="button"
                  onClick={() => setTimeFilter("month")}
                  className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all active:scale-[0.96] ${timeFilter === "month" ? "bg-white text-forest shadow-sm dark:bg-surface dark:text-emerald-100" : "text-stone-500 dark:text-stone-400"}`}
                >
                  {t("report.timeMonth")}
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-8 print:hidden">
          <h3 className="font-display text-xl text-forest dark:text-emerald-100">
            {t("report.timelineTitle")}
          </h3>

          {isLoading ? (
            <div className="mt-4 space-y-3">
              <div className="h-20 animate-pulse rounded-2xl bg-white dark:bg-surface" />
              <div className="h-20 animate-pulse rounded-2xl bg-white dark:bg-surface" />
            </div>
          ) : filteredMemories.length === 0 ? (
            <div className="mt-6 rounded-3xl bg-white p-8 text-center dark:bg-surface">
              <p className="text-base font-semibold text-stone-600 dark:text-stone-300">
                {memories.length === 0 ? t("report.emptyState", { name: activeChild?.name || "Anak" }) : t("report.emptyFilterState")}
              </p>
            </div>
          ) : (
            <div className="mt-4 space-y-6">
              {[
                { key: "today", label: t("report.today"), items: timelineGroups.today },
                { key: "yesterday", label: t("report.yesterday"), items: timelineGroups.yesterday },
                { key: "thisWeek", label: t("report.thisWeek"), items: timelineGroups.thisWeek },
                { key: "earlier", label: t("report.earlier"), items: timelineGroups.earlier },
              ].map((group) => {
                if (group.items.length === 0) return null
                return (
                  <div key={group.key} className="space-y-3">
                    <p className="text-xs font-bold uppercase tracking-wider text-forest/70 dark:text-emerald-300">
                      {group.label} ({group.items.length})
                    </p>
                    <div className="space-y-2">
                      {group.items.map((mem) => {
                        const surah = surahFor(mem.surahId)
                        const verseCount = mem.endAyah - mem.startAyah + 1
                        const isOverdue = mem.nextReviewAt && new Date(mem.nextReviewAt) < new Date()
                        const isMutqin = mem.status === "mutqin" || !isOverdue

                        return (
                          <div
                            key={mem.id}
                            className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm transition-[transform,box-shadow] hover:shadow-md dark:border-stone-800 dark:bg-surface"
                          >
                            <div className="flex items-center gap-3">
                              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-peach font-bold tabular-nums text-terracotta">
                                {mem.surahId}
                              </span>
                              <div>
                                <b className="block text-base text-forest dark:text-emerald-100">
                                  QS. {surah ? surah.name : mem.surahId}
                                </b>
                                <p className="mt-0.5 text-xs text-stone-500 dark:text-stone-400">
                                  {rangeLabel(mem.startAyah, mem.endAyah, t)} · {t("report.versesCount", { count: verseCount })}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-3">
                              <span
                                className={`rounded-full px-3 py-1 text-xs font-bold ${isMutqin ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-200" : "bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-200"}`}
                              >
                                {isMutqin ? t("report.mutqin") : t("report.needReview")}
                              </span>

                              {onStartReview && (
                                <button
                                  type="button"
                                  onClick={() => onStartReview(mem)}
                                  className="secondary-button flex items-center gap-1.5 !px-3 !py-1.5 text-xs font-bold active:scale-[0.96] transition-transform"
                                >
                                  <RotateCcw size={14} />
                                  <span>{t("report.startReview")}</span>
                                </button>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        <section className="hidden print:block pt-8">
          <h2 className="text-xl font-bold text-black border-b pb-2">{t("report.printReportTitle")}</h2>
          <div className="mt-4 flex justify-between text-sm">
            <p><strong>{t("report.childInfo", { name: activeChild?.name || "Anak", age: activeChild?.age ? `${activeChild.age} tahun` : "" })}</strong></p>
            <p>{t("report.printGeneratedAt", { date: new Date().toLocaleDateString("id-ID") })}</p>
          </div>

          <table className="mt-6 w-full border-collapse border border-stone-300 text-left text-sm">
            <thead>
              <tr className="bg-stone-100">
                <th className="border border-stone-300 p-2">Surah</th>
                <th className="border border-stone-300 p-2">Rentang Ayat</th>
                <th className="border border-stone-300 p-2">Jumlah Ayat</th>
                <th className="border border-stone-300 p-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {memories.map((mem) => {
                const surah = surahFor(mem.surahId)
                const isOverdue = mem.nextReviewAt && new Date(mem.nextReviewAt) < new Date()
                const isMutqin = mem.status === "mutqin" || !isOverdue

                return (
                  <tr key={mem.id}>
                    <td className="border border-stone-300 p-2">QS. {surah ? surah.name : mem.surahId}</td>
                    <td className="border border-stone-300 p-2">{mem.startAyah} - {mem.endAyah}</td>
                    <td className="border border-stone-300 p-2">{mem.endAyah - mem.startAyah + 1}</td>
                    <td className="border border-stone-300 p-2">{isMutqin ? "Mutqin" : "Perlu Murojaah"}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </section>
      </div>
    </main>
  )
}
