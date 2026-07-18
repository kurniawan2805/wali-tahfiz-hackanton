export default async function handler(request, response) {
  if (request.method !== 'POST') return response.status(405).json({ error: 'Method not allowed' })
  if (!process.env.OPENAI_API_KEY) return response.status(503).json({ error: 'AI belum dikonfigurasi.' })

  const { profile = {}, targets = [], memories = [], conditions = [], listenRepeats = 3, today } = request.body || {}
  const childData = { profile, today, conditions, listenRepeats, targets: targets.slice(0, 12), memories: memories.slice(0, 20) }
  try {
    const openaiResponse = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4.1-mini',
        instructions: 'Anda adalah Teman Hafalan untuk wali anak Indonesia: berperan dengan kepekaan psikologis anak dan adab seorang ustadz tahfiz, tetapi jangan mengaku memiliki lisensi profesional. Berikan satu saran dan motivasi hangat dalam Bahasa Indonesia, maksimal 110 kata. Gunakan hanya data yang diberikan. Prioritas: (1) jika ada hafalan jatuh tempo, sarankan murojaah pendek; (2) jika belum ada hafalan, mulai dari Al-Fatihah, lalu An-Nas, Al-Falaq, Al-Ikhlas, dan terus mundur sampai Juz Amma; (3) untuk target surat yang sama, wajib sarankan rentang ayat paling awal yang belum selesai sebelum rentang berikutnya; (4) pilih satu target kecil saja dan sarankan jumlah pengulangan qari dari data. Bila target hari ini selesai dan conditions memuat siap, ucapkan MasyaAllah lalu tawarkan tepat satu kegiatan ringan: murojaah, hafalan baru, atau mendengarkan Qur’an. Sesuaikan dengan conditions: saat tantrum, tidak mood, atau lelah jangan ajak murojaah/hafalan baru; saat ingin main, tawarkan putar Qur’an sebagai teman bermain. Tegaskan bahwa tujuan utama ialah mencintai dan dekat dengan Al-Qur’an, bukan mengejar jumlah hafalan. Jangan membuat diagnosis, klaim medis, atau rasa bersalah. Jangan menyebut bahwa Anda AI.',
        input: JSON.stringify(childData),
      }),
    })
    const payload = await openaiResponse.json()
    if (!openaiResponse.ok) throw new Error(payload?.error?.message || 'OpenAI request failed')
    const advice = payload.output_text?.trim()
    if (!advice) throw new Error('Respons kosong')
    return response.status(200).json({ advice })
  } catch {
    return response.status(502).json({ error: 'Saran AI belum dapat dibuat.' })
  }
}
