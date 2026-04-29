import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseKey)

// Upload de foto para Storage
export async function uploadFoto(file, pasta = 'fotos-relatorios') {
  const ext = file.name.split('.').pop()
  const nome = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const { data, error } = await supabase.storage
    .from(pasta)
    .upload(nome, file, { cacheControl: '3600', upsert: false })
  if (error) throw error
  const { data: urlData } = supabase.storage.from(pasta).getPublicUrl(nome)
  return urlData.publicUrl
}
