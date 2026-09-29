// Free, no-signup translation via the MyMemory API. Used to auto-translate
// article/research content the first time a reader picks a language it
// hasn't been written in yet. The result is cached back into Supabase (see
// PostsPage.jsx), so any given piece of content is only ever translated
// once, no matter how many readers view it afterward -- keeping this
// permanently within MyMemory's free daily allowance.
//
// MyMemory limits each single request to roughly 500 characters, so long
// article bodies are split into paragraph/sentence-sized pieces, translated
// one at a time, then rejoined with the original paragraph breaks restored.

const MAX_CHUNK = 450

async function translateChunk(text, targetLang) {
  if (!text || !text.trim()) return text
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|${targetLang}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Translation request failed (${res.status})`)
  const data = await res.json()
  return data?.responseData?.translatedText || text
}

function splitLongParagraph(paragraph) {
  const sentences = paragraph.match(/[^.!?]+[.!?]+|\S+$/g) || [paragraph]
  const pieces = []
  let buffer = ''
  for (const s of sentences) {
    if ((buffer + s).length > MAX_CHUNK) {
      if (buffer) pieces.push(buffer.trim())
      buffer = s
    } else {
      buffer += s
    }
  }
  if (buffer) pieces.push(buffer.trim())
  return pieces
}

export async function translateLongText(text, targetLang) {
  if (!text) return ''
  const paragraphs = text.split('\n\n')
  const translatedParagraphs = []
  for (const para of paragraphs) {
    if (!para.trim()) { translatedParagraphs.push(para); continue }
    if (para.length <= MAX_CHUNK) {
      translatedParagraphs.push(await translateChunk(para, targetLang))
    } else {
      const pieces = splitLongParagraph(para)
      const translatedPieces = []
      for (const piece of pieces) {
        translatedPieces.push(await translateChunk(piece, targetLang))
      }
      translatedParagraphs.push(translatedPieces.join(' '))
    }
  }
  return translatedParagraphs.join('\n\n')
}

// Translates an { title, excerpt, body } content object (as stored under
// post.translations.en) into the given target language code.
export async function translatePostContent(enContent, targetLang) {
  const title = enContent.title ? await translateChunk(enContent.title, targetLang) : ''
  const excerpt = enContent.excerpt ? await translateChunk(enContent.excerpt, targetLang) : ''
  const body = await translateLongText(enContent.body || '', targetLang)
  return { title, excerpt, body }
}