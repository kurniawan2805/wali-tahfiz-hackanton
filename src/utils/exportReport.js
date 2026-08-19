
export function triggerPrintReport() {
  if (typeof window !== 'undefined') {
    window.print()
  }
}

export function exportReportToCsv({ child, memories = [], getSurahName }) {
  if (typeof window === 'undefined') return

  const headers = ['Surah', 'Nomor Surah', 'Ayat Awal', 'Ayat Akhir', 'Jumlah Ayat', 'Status Murojaah', 'Murojaah Berikutnya', 'Dibuat Pada']

  const rows = memories.map((memory) => {
    const surahName = getSurahName ? getSurahName(memory.surahId) : `QS. ${memory.surahId}`
    const verseCount = memory.endAyah - memory.startAyah + 1
    const isMutqin = memory.status === 'mutqin' || !memory.nextReviewAt || new Date(memory.nextReviewAt) > new Date()
    const statusText = memory.status === 'mutqin' ? 'Mutqin (Sangat Lancar)' : isMutqin ? 'Lancar' : 'Perlu Murojaah'
    const nextReviewStr = memory.nextReviewAt ? new Date(memory.nextReviewAt).toLocaleDateString('id-ID') : '-'
    const createdStr = memory.createdAt ? new Date(memory.createdAt).toLocaleDateString('id-ID') : '-'

    return [
      `"${surahName.replace(/"/g, '""')}"`,
      memory.surahId,
      memory.startAyah,
      memory.endAyah,
      verseCount,
      `"${statusText}"`,
      `"${nextReviewStr}"`,
      `"${createdStr}"`,
    ].join(',')
  })

  const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  const filename = `Laporan_Hafalan_${(child?.name || 'Anak').replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`

  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
