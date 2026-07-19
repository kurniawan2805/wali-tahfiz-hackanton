import assert from 'node:assert/strict'
import test from 'node:test'
import { extractOutputText } from './daily-coach.js'

test('extractOutputText supports the raw Responses API message shape', () => {
  const payload = { output: [{ type: 'message', content: [{ type: 'output_text', text: '{"title":"Pelan dulu"}' }] }] }
  assert.equal(extractOutputText(payload), '{"title":"Pelan dulu"}')
})

test('extractOutputText retains the SDK convenience field when present', () => {
  assert.equal(extractOutputText({ output_text: ' {"title":"Siap"} ' }), '{"title":"Siap"}')
})
