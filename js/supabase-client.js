// =============================================
// CONFIGURACIÓN DE SUPABASE
// Reemplaza estos valores con los de tu proyecto
// =============================================

const SUPABASE_URL = "https://tmqpawykchvrfjzxghhu.supabase.co/rest/v1/";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRtcXBhd3lrY2h2cmZqenhnaGh1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5NTAwODAsImV4cCI6MjA5NjUyNjA4MH0.uCFWG1VFeZsTY2VV9DZFCavmTlB_Atr177Q5wwpacVM";

// Inicialización del cliente de Supabase
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);