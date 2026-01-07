// supabase-config.js

// Configurazione Supabase
// Inserisci qui le tue credenziali reali

const SUPABASE_URL = 'https://pmqmnsermpriygypmbtv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBtcW1uc2VybXByaXlneXBtYnR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk1NzE3MjYsImV4cCI6MjA2NTE0NzcyNn0.2plJuNt476GRLrz8tOnb8v648osBlod_r1Fq9hhFMjo';

// Inizializza il client Supabase per uso globale (browser)
window.supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
