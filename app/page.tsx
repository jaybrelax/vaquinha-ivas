/* eslint-disable react-hooks/set-state-in-effect */
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Heart, 
  Mic, 
  Plus, 
  Trash2, 
  Target, 
  Search, 
  Users, 
  Award, 
  TrendingUp, 
  Coins, 
  HelpCircle,
  Sparkles,
  Info,
  Upload,
  FileCheck,
  X,
  Database,
  CheckCircle,
  AlertCircle,
  Eye,
  FileText,
  ChevronDown,
  ChevronUp,
  Settings,
  Sliders
} from 'lucide-react';
import { getSupabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'motion/react';
import Link from 'next/link';

interface Donor {
  id: string;
  name: string;
  amount: number;
  date: string;
  receipt_url?: string | null;
}

const INITIAL_DONORS: Donor[] = [
  { id: '1', name: 'Alana Vieira', amount: 120, date: '2026-06-15', receipt_url: null },
  { id: '2', name: 'Bruno Guimarães', amount: 80, date: '2026-06-14', receipt_url: null },
  { id: '3', name: 'Carla Souza', amount: 150, date: '2026-06-14', receipt_url: null },
];

export default function Home() {
  const [donors, setDonors] = useState<Donor[]>([]);
  const [goal, setGoal] = useState<number>(500);
  const [title, setTitle] = useState<string>('Vaquinha do Microfone');
  const [description, setDescription] = useState<string>('Ajude-nos a adquirir o novo microfone Hollyland Lark A1 e eleve a qualidade dos áudios.');
  const [imageUrl, setImageUrl] = useState<string>('/lark-microphone.jpg');
  const [name, setName] = useState<string>('');
  const [amountStr, setAmountStr] = useState<string>('');
  const [search, setSearch] = useState<string>('');
  const [isClient, setIsClient] = useState<boolean>(false);
  const [formError, setFormError] = useState<string>('');
  
  // Collapsible toggle for form
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  
  // File upload state
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  
  // Supabase states
  const [isSupabase, setIsSupabase] = useState<boolean>(false);
  const [showConfigTips, setShowConfigTips] = useState<boolean>(false);
  const [isLoadingDb, setIsLoadingDb] = useState<boolean>(true);
  const [dbError, setDbError] = useState<string>('');
  const [tableMissing, setTableMissing] = useState<boolean>(false);
  
  // Modal for viewer
  const [activeReceiptUrl, setActiveReceiptUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadLocalDonations = () => {
    const savedDonors = localStorage.getItem('campaign_donors');
    const savedGoal = localStorage.getItem('campaign_goal');
    const savedTitle = localStorage.getItem('campaign_title');
    const savedDesc = localStorage.getItem('campaign_description');
    const savedImageUrl = localStorage.getItem('campaign_image_url');
    
    if (savedDonors) {
      try {
        setDonors(JSON.parse(savedDonors));
      } catch (e) {
        setDonors(INITIAL_DONORS);
      }
    } else {
      setDonors(INITIAL_DONORS);
    }

    if (savedGoal) {
      const g = parseFloat(savedGoal);
      if (!isNaN(g)) setGoal(g);
    }
    if (savedTitle) setTitle(savedTitle);
    if (savedDesc) setDescription(savedDesc);
    if (savedImageUrl) setImageUrl(savedImageUrl);
  };

  const fetchSupabaseDonations = async () => {
    setIsLoadingDb(true);
    setDbError('');
    setTableMissing(false);
    const supabase = getSupabase();
    if (!supabase) return;

    try {
      // Fetch donors
      const { data, error } = await supabase
        .from('donations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      if (data) {
        const parsedDonors: Donor[] = data.map((item: any) => ({
          id: item.id.toString(),
          name: item.name,
          amount: parseFloat(item.amount),
          date: item.created_at ? item.created_at.split('T')[0] : new Date().toISOString().split('T')[0],
          receipt_url: item.receipt_url,
        }));
        setDonors(parsedDonors);
      }

      // Fetch campaign configuration table
      const { data: configData, error: configError } = await supabase
        .from('campaign_config')
        .select('*')
        .eq('id', 1)
        .single();

      if (!configError && configData) {
        setTitle(configData.title || 'Vaquinha do Microfone');
        setDescription(configData.description || 'Ajude-nos a adquirir o novo microfone Hollyland Lark A1 e eleve a qualidade dos áudios.');
        setGoal(parseFloat(configData.goal) || 500);
        setImageUrl(configData.image_url || '/lark-microphone.jpg');
      } else {
        if (configError && configError.message && (configError.message.includes('campaign_config') || configError.message.includes('schema cache'))) {
          throw configError;
        }
        // Fallback local campaign data
        const savedGoal = localStorage.getItem('campaign_goal');
        if (savedGoal) {
          const g = parseFloat(savedGoal);
          if (!isNaN(g)) setGoal(g);
        }
        const savedTitle = localStorage.getItem('campaign_title');
        if (savedTitle) setTitle(savedTitle);
        const savedDesc = localStorage.getItem('campaign_description');
        if (savedDesc) setDescription(savedDesc);
        const savedImageUrl = localStorage.getItem('campaign_image_url');
        if (savedImageUrl) setImageUrl(savedImageUrl);
      }
    } catch (err: any) {
      console.error('Supabase fetch error details:', err);
      
      const errMsg = err.message || '';
      const isMissing = errMsg.includes('donations') || 
                        errMsg.includes('campaign_config') || 
                        errMsg.includes('schema cache') || 
                        errMsg.includes('relation');

      if (isMissing) {
        setTableMissing(true);
        setDbError(`As tabelas necessárias não foram encontradas no Supabase. Execute o script SQL no seu painel para criá-las.`);
      } else {
        setDbError(`Erro ao acessar o Supabase: ${errMsg}. Rodando em modo local temporário.`);
      }
      loadLocalDonations();
    } finally {
      setIsLoadingDb(false);
    }
  };

  // Initialize and check Supabase connection
  useEffect(() => {
    setIsClient(true);
    const supabase = getSupabase();
    
    if (supabase) {
      setIsSupabase(true);
      fetchSupabaseDonations();
    } else {
      setIsSupabase(false);
      setIsLoadingDb(false);
      loadLocalDonations();
    }
  }, []);

  // Sync Local Fallback changes to localStorage
  useEffect(() => {
    if (isClient && !isSupabase) {
      localStorage.setItem('campaign_donors', JSON.stringify(donors));
    }
  }, [donors, isClient, isSupabase]);

  // Sync Campaign Goal to locale storage (as fallback)
  useEffect(() => {
    if (isClient) {
      localStorage.setItem('campaign_goal', goal.toString());
    }
  }, [goal, isClient]);

  const totalRaised = donors.reduce((acc, curr) => acc + curr.amount, 0);
  const progressPercent = goal > 0 ? Math.min((totalRaised / goal) * 100, 100) : 0;
  const remaining = Math.max(goal - totalRaised, 0);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(val);
  };

  // Modern file handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      processFile(file);
    }
  };

  const processFile = (file: File) => {
    // Validate type (images/pdf)
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      setFormError('Formato inválido. Faça upload de PNG, JPG, WEBP ou PDF.');
      return;
    }

    setFormError('');
    setReceiptFile(file);

    // Create dynamic local preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setReceiptPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const removeReceipt = () => {
    setReceiptFile(null);
    setReceiptPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Drag over handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      processFile(file);
    }
  };

  // Upload file helper for Supabase Storage
  const uploadToSupabase = async (file: File): Promise<string | null> => {
    const supabase = getSupabase();
    if (!supabase) return null;

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `receipt-${Date.now()}.${fileExt}`;
      const filePath = `donations/${fileName}`;

      const { data, error } = await supabase.storage
        .from('comprovantes')
        .upload(filePath, file, { cacheControl: '3600', upsert: false });

      if (error) {
        throw error;
      }

      // Retrieve public URL
      const { data: publicData } = supabase.storage
        .from('comprovantes')
        .getPublicUrl(filePath);

      return publicData.publicUrl;
    } catch (err: any) {
      console.error('File upload failed:', err.message);
      throw new Error(`Falha ao subir comprovante: ${err.message}`);
    }
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, "");
    if (value) {
      value = (parseInt(value, 10) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    setAmountStr(value);
  };

  const handleAddDonor = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!name.trim()) {
      setFormError('Por favor, insira o nome do doador.');
      return;
    }

    const cleanedAmount = amountStr.replace(/\./g, '').replace(',', '.');
    const parsedAmount = parseFloat(cleanedAmount);

    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setFormError('Por favor, insira um valor de doação válido maior que zero.');
      return;
    }

    setIsUploading(true);
    let uploadedUrl: string | null = null;

    try {
      const supabase = getSupabase();

      // Handle real cloud upload or convert local base64 preview
      if (receiptFile) {
        if (isSupabase && supabase) {
          uploadedUrl = await uploadToSupabase(receiptFile);
        } else {
          // Store base64 payload as fallback in Local Mode
          uploadedUrl = receiptPreview;
        }
      }

      if (isSupabase && supabase) {
        // SQL integration
        const { data, error } = await supabase
          .from('donations')
          .insert([
            { 
              name: name.trim(), 
              amount: parsedAmount, 
              receipt_url: uploadedUrl 
            }
          ])
          .select();

        if (error) {
          throw error;
        }

        // Refetch to align exact schema ID
        await fetchSupabaseDonations();
      } else {
        // Fallback local list modification
        const newDonor: Donor = {
          id: Date.now().toString(),
          name: name.trim(),
          amount: parsedAmount,
          date: new Date().toISOString().split('T')[0],
          receipt_url: uploadedUrl,
        };
        setDonors([newDonor, ...donors]);
      }

      // Success cleanup
      setName('');
      setAmountStr('');
      setReceiptFile(null);
      setReceiptPreview(null);
      setIsFormOpen(false); // Close matching user requests

    } catch (err: any) {
      console.error('Error adding donation:', err);
      setFormError(err.message || 'Ocorreu um erro no servidor ao processar a doação.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleQuickDonate = (value: number) => {
    setAmountStr(value.toString());
  };

  const handleDeleteDonor = async (id: string, name: string) => {
    if (!confirm(`Deseja remover a doação de "${name}"?`)) return;

    if (isSupabase) {
      const supabase = getSupabase();
      if (!supabase) return;

      try {
        const { error } = await supabase
          .from('donations')
          .delete()
          .eq('id', id);

        if (error) throw error;
        fetchSupabaseDonations();
      } catch (err: any) {
        alert(`Erro de remoção: ${err.message}`);
      }
    } else {
      setDonors(donors.filter(d => d.id !== id));
    }
  };

  const handleResetCampaign = async () => {
    if (!confirm('Tem certeza de que deseja limpar todas as doações? Isso apagará o histórico.')) return;

    if (isSupabase) {
      const supabase = getSupabase();
      if (!supabase) return;

      try {
        const { error } = await supabase
          .from('donations')
          .delete()
          .not('id', 'is', null); // Clears entire table payload safe

        if (error) throw error;
        fetchSupabaseDonations();
      } catch (err: any) {
        alert(`Erro ao reiniciar campanha: ${err.message}`);
      }
    } else {
      setDonors([]);
      setName('');
      setAmountStr('');
      setFormError('');
    }
  };

  const filteredDonors = donors.filter(d => 
    d.name.toLowerCase().includes(search.toLowerCase())
  );

  const getInitials = (fullName: string) => {
    const parts = fullName.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return fullName.slice(0, 2).toUpperCase();
  };

  const avatarBgColors = [
    'bg-indigo-50 text-indigo-700 border-indigo-100',
    'bg-slate-100 text-slate-700 border-slate-200',
    'bg-amber-50 text-amber-700 border-amber-100',
    'bg-rose-50 text-rose-700 border-rose-100',
    'bg-cyan-50 text-cyan-700 border-cyan-100',
    'bg-violet-50 text-violet-700 border-violet-100'
  ];

  const getAvatarStyle = (index: number) => {
    return avatarBgColors[index % avatarBgColors.length];
  };

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20 font-sans antialiased text-slate-800">
      {/* Background glow styling */}
      <div className="absolute top-0 inset-x-0 h-96 bg-gradient-to-b from-indigo-50/50 to-transparent pointer-events-none" />

      {/* CORE CONTAINER */}
      <main className="relative max-w-xl mx-auto px-4 pt-8">
        
        {/* HEADER BRAND & CONNECTIONS STATUS */}
        <header className="flex flex-col items-center text-center mb-6">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 md:text-4xl leading-tight">
            {title}
          </h1>
          <p className="mt-2 text-sm text-slate-400 max-w-sm leading-relaxed">
            {description}
          </p>
        </header>

        {/* DATABASE TABLE MISSING ALERT */}
        <AnimatePresence>
          {isSupabase && tableMissing && (
            <motion.section
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              className="mb-6 overflow-hidden"
            >
              <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-3xl p-5 shadow-sm space-y-3 relative">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-rose-100 rounded-xl text-rose-600 shrink-0">
                    <AlertCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-rose-950">
                      Tabelas Supabase Ausentes ou Incompletas
                    </h3>
                    <p className="text-xs text-rose-700 mt-1 leading-relaxed">
                      Conectamos ao seu Supabase, mas a tabela <code className="bg-rose-100/60 px-1 py-0.5 rounded font-mono font-bold">donations</code> ou <code className="bg-rose-100/60 px-1 py-0.5 rounded font-mono font-bold">campaign_config</code> não foi encontrada ou não está no cache de esquema.
                    </p>
                  </div>
                </div>

                <div className="text-xs bg-slate-900 text-slate-200 rounded-2xl p-4 flex flex-col font-mono space-y-1 block max-h-48 overflow-y-auto shadow-inner select-all">
                  <p className="text-yellow-400 font-bold block">-- Copie e execute este script SQL no Editor de SQL do Supabase:</p>
                  <p>-- 1. Tabela de Doações</p>
                  <p>CREATE TABLE IF NOT EXISTS donations (</p>
                  <p>&nbsp;&nbsp;id uuid DEFAULT gen_random_uuid() PRIMARY KEY,</p>
                  <p>&nbsp;&nbsp;name text NOT NULL,</p>
                  <p>&nbsp;&nbsp;amount numeric NOT NULL,</p>
                  <p>&nbsp;&nbsp;receipt_url text,</p>
                  <p>&nbsp;&nbsp;created_at timestamp with time zone default timezone(&apos;utc&apos;::text, now()) NOT NULL</p>
                  <p>);</p>
                  <p className="text-yellow-400 font-bold mt-2 block">-- 2. Tabela de Configurações da Campanha</p>
                  <p>CREATE TABLE IF NOT EXISTS campaign_config (</p>
                  <p>&nbsp;&nbsp;id integer PRIMARY KEY DEFAULT 1,</p>
                  <p>&nbsp;&nbsp;title text NOT NULL DEFAULT &apos;Vaquinha do Microfone&apos;,</p>
                  <p>&nbsp;&nbsp;description text NOT NULL DEFAULT &apos;Ajude-nos a adquirir o novo microfone Hollyland Lark A1 e eleve a qualidade dos áudios.&apos;,</p>
                  <p>&nbsp;&nbsp;goal numeric NOT NULL DEFAULT 500,</p>
                  <p>&nbsp;&nbsp;image_url text NOT NULL DEFAULT &apos;/lark-microphone.jpg&apos;,</p>
                  <p>&nbsp;&nbsp;CONSTRAINT check_single_row CHECK (id = 1)</p>
                  <p>);</p>
                  <p className="text-yellow-400 font-bold mt-2 block">-- 3. Registro padrão inicial</p>
                  <p>INSERT INTO campaign_config (id, title, description, goal, image_url)</p>
                  <p>VALUES (1, &apos;Vaquinha do Microfone&apos;, &apos;Ajude-nos a adquirir o novo microfone Hollyland Lark A1 e eleve a qualidade dos áudios.&apos;, 500, &apos;/lark-microphone.jpg&apos;)</p>
                  <p>ON CONFLICT (id) DO NOTHING;</p>
                </div>

                <div className="flex items-center justify-between pt-1 flex-wrap gap-2 text-[10px] text-rose-700">
                  <span className="flex items-center gap-1">
                    <Info className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                    Modo seguro Local ativado automaticamente de fallback.
                  </span>
                  <button
                    onClick={() => {
                      fetchSupabaseDonations();
                    }}
                    className="px-2.5 py-1 bg-rose-200/50 hover:bg-rose-200 text-rose-900 border border-rose-300/40 rounded-xl font-bold transition-all cursor-pointer"
                  >
                    Tentar Novamente
                  </button>
                </div>
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* INSTRUCTIONAL TIP PANEL */}
        <AnimatePresence>
          {showConfigTips && (
            <motion.section 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden mb-6"
            >
              <div className="bg-white border border-indigo-100 rounded-3xl p-6 text-xs text-slate-600 space-y-3 shadow-sm relative">
                <button 
                  onClick={() => setShowConfigTips(false)}
                  className="absolute top-4 right-4 p-1 rounded-lg text-slate-300 hover:text-slate-500 hover:bg-slate-50"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                  <Database className="w-4 h-4 text-indigo-500" />
                  Instalação Supabase na Vercel / Cloud
                </div>
                <p>
                  Para habilitar persistência global na web, configure as seguintes variáveis no painel da Vercel ou no seu arquivo local:
                </p>
                <div className="bg-slate-900 text-slate-200 p-3 rounded-xl font-mono text-[10px] space-y-1 block select-all">
                  <p>NEXT_PUBLIC_SUPABASE_URL=sua-url-do-supabase</p>
                  <p>NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anonima</p>
                </div>
                <p className="font-semibold text-slate-800">
                  Estrutura da Tabela SQL (`donations`):
                </p>
                <pre className="bg-slate-50 border border-slate-200/60 p-2.5 rounded-xl text-[9px] overflow-x-auto text-slate-600 font-mono">{`create table donations (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  amount numeric not null,
  receipt_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);`}
                </pre>
                <p>
                  Crie também um bucket público chamado <strong className="text-indigo-600">comprovantes</strong> na aba Storage para permitir uploads dos comprovantes.
                </p>
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* GOAL CARD VIEW */}
        <section id="campaign-goal-card" className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 mb-6">
          <div className="relative aspect-[16/9] w-full bg-slate-900 group">
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-black/30 z-10" />
            <img 
              src={imageUrl}
              alt={title}
              referrerPolicy="no-referrer"
              className="absolute inset-0 w-full h-full object-cover select-none transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute top-3 right-3 z-20">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-black/60 shadow-lg backdrop-blur-md rounded-full text-xs font-medium text-white border border-white/10">
                <Mic className="w-3 h-3 text-indigo-400" />
                Campanha Ativa
              </span>
            </div>
            <div className="absolute bottom-4 left-4 right-4 z-20 text-white">
              <span className="text-indigo-400 text-xs font-bold uppercase tracking-wider">Objetivo de Arrecadação</span>
              <h2 className="text-lg font-bold mt-0.5 tracking-tight line-clamp-1">{title}</h2>
              <p className="text-xs text-white/80 line-clamp-2 mt-0.5 font-light">
                {description}
              </p>
            </div>
          </div>

          <div className="p-6">
            <div className="mb-6">
              <div className="flex justify-between items-end mb-2">
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Total Arrecadado</span>
                  <p className="text-2xl font-black text-indigo-600">
                    {formatCurrency(totalRaised)}
                  </p>
                </div>
                <div className="text-right flex flex-col">
                  <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Objetivo</span>
                  <p className="text-base font-bold text-slate-700 leading-tight">
                    {formatCurrency(goal)}
                  </p>
                </div>
              </div>

              {/* Progress visual fill bar */}
              <div className="w-full bg-slate-150 h-3 rounded-full overflow-hidden relative border border-slate-200/40 bg-slate-100">
                <div 
                  className="bg-indigo-500 h-full rounded-full transition-all duration-500 ease-out relative"
                  style={{ width: `${progressPercent}%` }}
                >
                  <div className="absolute top-0 right-0 bottom-0 w-1.5 bg-white/20 animate-pulse" />
                </div>
              </div>

              <div className="flex justify-between items-center mt-3 text-xs">
                <span className="text-slate-500 font-medium">
                  {progressPercent.toFixed(0)}% Concluído
                </span>
                
                {remaining > 0 ? (
                  <span className="text-indigo-600 bg-indigo-50/60 px-2 py-0.5 rounded-md font-medium border border-indigo-100/50">
                    Faltam {formatCurrency(remaining)}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-purple-600 bg-purple-50 px-2 py-0.5 rounded-md font-bold border border-purple-100 animate-bounce">
                    <Award className="w-3.5 h-3.5" />
                    Meta Superada! 🎉
                  </span>
                )}
              </div>
            </div>


          </div>
        </section>

        {/* BTN ACCORDION: TO RE-ARRANGE BUTTON DIRECTLY ABOVE HISTORY LIST */}
        <div id="action-trigger-area" className="mb-4">
          <button
            type="button"
            onClick={() => setIsFormOpen(!isFormOpen)}
            className={`w-full py-3 px-4 rounded-2xl text-sm font-bold shadow-sm transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer ${
              isFormOpen 
                ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-250/30' 
                : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/10 active:scale-[0.99]'
            }`}
          >
            {isFormOpen ? (
              <>
                <X className="w-4 h-4" />
                Fechar Formulário de Doações
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 stroke-[3]" />
                Registrar Nova Doação
              </>
            )}
          </button>
        </div>

        {/* INPUT FORM PANEL (MODAL) */}
        <AnimatePresence>
          {isFormOpen && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
              onClick={() => setIsFormOpen(false)}
            >
              <motion.section 
                id="donor-form-card" 
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.95 }}
                className="bg-white border border-slate-100 rounded-3xl p-6 shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto relative"
                onClick={(e) => e.stopPropagation()}
              >
                <button 
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-2.5 mb-5 mt-2">
                  <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center">
                    <Heart className="w-4.5 h-4.5 fill-current animate-pulse" />
                  </div>
                  <div>
                    <h2 className="text-base font-extrabold text-slate-850">Lançar Nova Contribuição</h2>
                    <p className="text-xs text-slate-400">Insira as informações do doador e comprovante.</p>
                  </div>
                </div>

                <form onSubmit={handleAddDonor} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="donor-name" className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                        Nome do Doador
                      </label>
                      <input 
                        id="donor-name"
                        type="text"
                        placeholder="Ex: Mariana Silva"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400"
                      />
                    </div>

                    <div>
                      <label htmlFor="donor-amount" className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                        Valor Doado (R$)
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <span className="text-slate-400 text-sm font-semibold">R$</span>
                        </div>
                        <input 
                          id="donor-amount"
                          type="text"
                          inputMode="decimal"
                          placeholder="Ex: 50,00"
                          value={amountStr}
                          onChange={handleAmountChange}
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-300"
                        />
                      </div>
                    </div>
                  </div>

                  {/* SUGGESTED PRESETS */}
                  <div>
                    <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                      Sugestões Rápidas de Doação
                    </span>
                    <div className="grid grid-cols-5 gap-2">
                      {[10, 20, 30, 50, 80].map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => handleQuickDonate(val)}
                          className={`py-1.5 rounded-xl border text-xs font-bold transition-all duration-200 ${
                            amountStr === val.toString()
                              ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                              : 'bg-slate-50/50 hover:bg-slate-100 text-slate-600 border-slate-200 cursor-pointer'
                          }`}
                        >
                          R$ {val}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* MULTI-FUNCTION RECEIPT UPLOADER */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                      Comprovante de Pagamento
                    </label>
                    <div 
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className={`relative border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-250 ${
                        isDragOver
                          ? 'border-indigo-500 bg-indigo-50/50'
                          : receiptFile
                            ? 'border-emerald-300 bg-emerald-50/10'
                            : 'border-slate-200 hover:border-indigo-400 hover:bg-slate-50/40'
                      }`}
                    >
                      <input 
                        ref={fileInputRef}
                        type="file"
                        accept="image/*,application/pdf"
                        onChange={handleFileChange}
                        className="hidden"
                      />

                      {receiptFile ? (
                        <div className="space-y-2">
                          <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600">
                            {receiptFile.type.includes('pdf') ? (
                              <FileText className="w-5 h-5" />
                            ) : (
                              <FileCheck className="w-5 h-5" />
                            )}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-800 line-clamp-1 max-w-[240px] mx-auto">
                              {receiptFile.name}
                            </p>
                            <p className="text-[10px] text-slate-400">
                              {(receiptFile.size / 1024).toFixed(1)} KB • Arquivo adicionado
                            </p>
                          </div>
                          
                          {/* Image preview micro UI */}
                          {receiptPreview && !receiptFile.type.includes('pdf') && (
                            <div className="relative w-16 h-16 rounded-lg border border-slate-100 overflow-hidden mx-auto shadow-sm">
                              <img src={receiptPreview} alt="Comprovante" className="w-full h-full object-cover" />
                            </div>
                          )}

                          <button 
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeReceipt();
                            }}
                            className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors border border-rose-100/30"
                          >
                            <X className="w-3 h-3" />
                            Remover arquivo
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-500 flex items-center justify-center mx-auto border border-indigo-150">
                            <Upload className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-700">
                              Arraste seu comprovante aqui ou <span className="text-indigo-600">clique para abrir</span>
                            </p>
                            <p className="text-[10px] text-slate-400 mt-1">
                              Imagens (JPEG, PNG, WEBP) ou PDF de até 5MB
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {formError && (
                    <p className="text-xs font-semibold text-rose-500 bg-rose-50 border border-rose-100 rounded-xl p-3 flex items-center gap-1.5">
                      <Info className="w-4 h-4 shrink-0" />
                      {formError}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={isUploading}
                    className={`w-full text-white py-2.5 px-4 rounded-xl text-sm font-bold shadow-md active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer ${
                      isUploading 
                        ? 'bg-indigo-400 cursor-not-allowed' 
                        : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/10'
                    }`}
                  >
                    {isUploading ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Registrando e Enviando...
                      </>
                    ) : (
                      <>
                        <Plus className="w-4.5 h-4.5" />
                        Confirmar Doação
                      </>
                    )}
                  </button>
                </form>
              </motion.section>
            </motion.div>
          )}
        </AnimatePresence>

        {/* DONORS HISTORY HEADER & LIST CARD */}
        <section id="donors-list" className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-sm">
          <div className="p-6 border-b border-slate-100">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-slate-50 border border-slate-100 text-slate-500 flex items-center justify-center">
                  <Users className="w-4 h-4 text-indigo-500" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-800">
                    Histórico de Doações
                  </h2>
                  <p className="text-xs text-slate-400 font-medium">
                    {filteredDonors.length} de {donors.length} doador{donors.length !== 1 ? 'es' : ''}
                  </p>
                </div>
              </div>
              
              {donors.length > 0 && (
                <button
                  type="button"
                  onClick={handleResetCampaign}
                  className="text-slate-400 hover:text-rose-500 text-xs font-semibold flex items-center gap-1 transition-colors self-end sm:self-auto cursor-pointer"
                >
                  Limpar Histórico
                </button>
              )}
            </div>

            {/* SEARCH */}
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <Search className="w-4 h-4 text-slate-400" />
              </span>
              <input 
                type="text"
                placeholder="Buscar doador por nome..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-100 bg-slate-50 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-400 transition-all placeholder:text-slate-400"
              />
            </div>
          </div>

          {/* LIST BOX */}
          <div className="divide-y divide-slate-105/60 divide-slate-100 max-h-80 overflow-y-auto">
            {isLoadingDb ? (
              <div className="p-8 text-center flex flex-col items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                <p className="text-xs text-slate-400">Buscando doações no Supabase...</p>
              </div>
            ) : filteredDonors.length > 0 ? (
              filteredDonors.map((donor, idx) => (
                <div 
                  key={donor.id}
                  className="p-4 flex items-center justify-between hover:bg-slate-50/40 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-full border flex items-center justify-center text-xs font-bold leading-none shrink-0 ${getAvatarStyle(idx)}`}>
                      {getInitials(donor.name)}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-sm font-semibold text-slate-800 line-clamp-1 font-sans">
                          {donor.name}
                        </h4>
                        
                        {/* Receipt Icon Badge click activity */}
                        {donor.receipt_url && (
                          <button
                            type="button"
                            onClick={() => setActiveReceiptUrl(donor.receipt_url || null)}
                            className="p-1 rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-500 cursor-pointer transition-colors"
                            title="Ver Comprovante"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400 font-medium">
                        Doador nº {donors.length - idx} • {donor.date.split('-').reverse().join('/')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-indigo-600 bg-indigo-55/60 px-2.5 py-1 rounded-lg border border-indigo-100/30">
                      {formatCurrency(donor.amount)}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDeleteDonor(donor.id, donor.name)}
                      className="p-1.5 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50 sm:opacity-0 group-hover:opacity-100 transition-all duration-250 cursor-pointer animate-fade-in"
                      title="Excluir doação"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-slate-400 flex flex-col items-center justify-center">
                <Heart className="w-8 h-8 stroke-[1.5] text-slate-300 mb-2" />
                <p className="text-xs font-semibold">Nenhuma doação registrada nesta vaquinha</p>
                <p className="text-[10px] text-slate-400 max-w-[220px] mt-1 mx-auto text-center">
                  {donors.length === 0 
                    ? 'Abra o formulário no botão acima para registrar a primeira contribuição da campanha!' 
                    : 'Nenhum resultado corresponde à busca.'}
                </p>
              </div>
            )}
          </div>

          {filteredDonors.length > 0 && (
            <div className="p-4 bg-slate-50/55 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
              <span className="flex items-center gap-1.5">
                <Coins className="w-3.5 h-3.5 text-slate-400" />
                Fundo Arrecadado
              </span>
              <span className="font-extrabold text-indigo-600 bg-indigo-50/60 px-2.5 py-1 rounded-md border border-indigo-105/30">
                {formatCurrency(totalRaised)}
              </span>
            </div>
          )}
        </section>

        {/* METRICS & QUICK SUMMARY */}
        <section className="grid grid-cols-2 gap-4 mt-6">
          <div className="bg-white border border-slate-100 p-4 rounded-3xl flex items-center gap-3 shadow-[0_1px_2px_rgba(0,0,0,0.01)]">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Média de Doação</span>
              <h3 className="text-sm font-bold text-slate-800">
                {donors.length > 0 ? formatCurrency(totalRaised / donors.length) : 'R$ 0,00'}
              </h3>
            </div>
          </div>

          <div className="bg-white border border-slate-100 p-4 rounded-3xl flex items-center gap-3 shadow-[0_1px_2px_rgba(0,0,0,0.01)]">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Parceiros</span>
              <h3 className="text-sm font-bold text-slate-700">
                {donors.length} doador{donors.length !== 1 ? 'es' : ''}
              </h3>
            </div>
          </div>
        </section>

        {/* IVAS LOGO */}
        <div className="flex justify-center mt-10 mb-2">
          <img src="/ivas_logo.png" alt="Ivas Logo" className="h-12 opacity-80 hover:opacity-100 transition-opacity" />
        </div>

        {/* APP FOOTER INFO */}
        <footer className="mt-8 pb-8 text-center text-[10px] text-slate-400 font-medium space-y-5">
          <div className="flex flex-wrap justify-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50/50 border border-indigo-100/50 text-indigo-700/80 rounded-full text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-indigo-500/80" />
              Meta Coletiva 2026
            </span>

            {/* Supabase status badge */}
            <button 
              onClick={() => {
                setShowConfigTips(!showConfigTips);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-1 border rounded-full text-xs font-semibold cursor-pointer transition-all duration-200 ${
                isSupabase && !dbError
                  ? 'bg-emerald-50/50 border-emerald-100/50 text-emerald-700/80 hover:bg-emerald-100/80'
                  : 'bg-amber-50/50 border-amber-100/50 text-amber-700/80 hover:bg-amber-100/80'
              }`}
              title="Clique para ver instruções de integração"
            >
              <Database className="w-3.5 h-3.5" />
              {isSupabase && !dbError ? 'Supabase Conectado' : 'Modo Local (Banco Inativo)'}
            </button>

            {/* Admin control panel link */}
            <Link 
              href="/admin" 
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/50 hover:bg-slate-100 border border-slate-200/50 text-indigo-600/80 hover:text-indigo-700 rounded-full text-xs font-bold transition-all duration-200"
              title="Ir para o Painel Administrativo"
            >
              <Settings className="w-3.5 h-3.5 text-indigo-500/80" />
              Painel Admin
            </Link>
          </div>

          <div className="space-y-1">
            <p className="flex items-center justify-center gap-1">
              <HelpCircle className="w-3.5 h-3.5 text-slate-400/80" />
              Ao configurar o Supabase, os dados sincronizam instantaneamente na nuvem.
            </p>
            <p>© 2026 Campanha Hollyland Lark A1 • Desenvolvido para Vercel & Supabase.</p>
          </div>
        </footer>

      </main>

      {/* COMPROVANTE VIEWER MODAL DIALOG */}
      <AnimatePresence>
        {activeReceiptUrl && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setActiveReceiptUrl(null)}
          >
            <motion.div 
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl relative"
              onClick={(e) => e.stopPropagation()}
            >
              <button 
                onClick={() => setActiveReceiptUrl(null)}
                className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 rounded-lg bg-indigo-50 text-indigo-500">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">Visualizar Comprovante</h3>
                  <p className="text-[10px] text-slate-400">Anexo validado do doador</p>
                </div>
              </div>

              {activeReceiptUrl.startsWith('data:application/pdf') || activeReceiptUrl.endsWith('.pdf') ? (
                <div className="bg-slate-50 border rounded-2xl p-8 flex flex-col items-center justify-center text-center gap-3">
                  <FileText className="w-12 h-12 text-indigo-400" />
                  <div>
                    <p className="text-xs font-bold text-slate-700">Arquivo de Recibo PDF</p>
                    <p className="text-[10px] text-slate-400">Este formato de arquivo PDF pode ser acessado no link do botão abaixo</p>
                  </div>
                  <a 
                    href={activeReceiptUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-xl flex items-center gap-1"
                  >
                    Abrir arquivo PDF
                  </a>
                </div>
              ) : (
                <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-inner max-h-96 bg-slate-50 relative flex items-center justify-center">
                  <img 
                    src={activeReceiptUrl} 
                    alt="Comprovante de pagamento" 
                    className="max-h-80 w-full object-contain"
                  />
                </div>
              )}

              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => setActiveReceiptUrl(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all"
                >
                  Fechar janela
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
