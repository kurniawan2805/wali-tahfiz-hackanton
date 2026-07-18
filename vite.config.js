import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import dailyCoach from './api/daily-coach.js'

function localApi() {
  return {
    name: 'wali-tahfiz-local-api',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/api/daily-coach', async (request, response) => {
        const chunks = []
        for await (const chunk of request) chunks.push(chunk)
        try {
          request.body = chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {}
        } catch {
          response.statusCode = 400
          response.setHeader('Content-Type', 'application/json')
          response.end(JSON.stringify({ error: 'Body JSON tidak valid.' }))
          return
        }

        const apiResponse = {
          status(code) { response.statusCode = code; return apiResponse },
          json(payload) {
            response.setHeader('Content-Type', 'application/json')
            response.end(JSON.stringify(payload))
          },
        }
        await dailyCoach(request, apiResponse)
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  if (env.OPENAI_API_KEY) process.env.OPENAI_API_KEY = env.OPENAI_API_KEY
  return { plugins: [react(), localApi()] }
})
