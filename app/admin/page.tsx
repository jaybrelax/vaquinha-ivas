/* eslint-disable react-hooks/set-state-in-effect */
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, 
  Save, 
  Settings, 
  Database, 
  Image as ImageIcon, 
  Target, 
  FileText, 
  Sparkles, 
  CheckCircle, 
  AlertCircle,
  HelpCircle,
  Upload,
  FileCheck,
  X,
  Info
} from 'lucide-react';
import { getSupabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'motion/react';
import Link from 'next/link';

export default function Admin() {
  const [title, setTitle] = useState<string>('Vaquinha do Microfone');
  const [description, setDescription] = useState<string>('Ajude-nos a adquirir o novo microfone Hollyland Lark A1 e eleve a qualidade dos áudios.');
  const [goalStr, setGoalStr] = useState<string>('500');
  const [imageUrl, setImageUrl] = useState<string>('/lark-microphone.jpg');
  const [pixKey, setPixKey] = useState<string>('');
  const [pixHolder, setPixHolder] = useState<string>('');
  const [pixBank, setPixBank] = useState<string>('');

  const [isCountdownActive, setIsCountdownActive] = useState<boolean>(false);
  const [countdownDeadline, setCountdownDeadline] = useState<string>('');
  
  // Storage bucket upload state
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [isUploadingCover, setIsUploadingCover] = useState<boolean>(false);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  
  const [isSupabase, setIsSupabase] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  const coverInputRef = useRef<HTMLInputElement>(null);

  const loadLocalConfig = () => {
    const savedTitle = localStorage.getItem('campaign_title');
    const savedDesc = localStorage.getItem('campaign_description');
    const savedGoal = localStorage.getItem('campaign_goal');
    const savedImageUrl = localStorage.getItem('campaign_image_url');
    const savedPixKey = localStorage.getItem('campaign_pix_key');
    const savedPixHolder = localStorage.getItem('campaign_pix_holder');
    const savedPixBank = localStorage.getItem('campaign_pix_bank');
    const savedCountdownActive = localStorage.getItem('campaign_is_countdown_active');
    const savedCountdownDeadline = localStorage.getItem('campaign_countdown_deadline');

    if (savedTitle) setTitle(savedTitle);
    if (savedDesc) setDescription(savedDesc);
    if (savedGoal) setGoalStr(savedGoal);
    if (savedImageUrl) setImageUrl(savedImageUrl);
    if (savedPixKey) setPixKey(savedPixKey);
    if (savedPixHolder) setPixHolder(savedPixHolder);
    if (savedPixBank) setPixBank(savedPixBank);
    if (savedCountdownActive) setIsCountdownActive(savedCountdownActive === 'true');
    if (savedCountdownDeadline) setCountdownDeadline(savedCountdownDeadline);
  };

  const fetchCampaignConfig = async (supabase: any) => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('campaign_config')
        .select('*')
        .eq('id', 1)
        .single();

      if (error) {
        throw error;
      }

      if (data) {
        setTitle(data.title || 'Vaquinha do Microfone');
        setDescription(data.description || 'Ajude-nos a adquirir o novo microfone...');
        setGoalStr(data.goal ? data.goal.toString() : '500');
        setImageUrl(data.image_url || '/lark-microphone.jpg');
        setPixKey(data.pix_key || '');
        setPixHolder(data.pix_holder || '');
        setPixBank(data.pix_bank || '');
        
        // Supabase might return null or undefined, default carefully
        setIsCountdownActive(data.is_countdown_active || false);
        if (data.countdown_deadline) {
          // Format from '2026-06-30T23:59:00+00:00' to '2026-06-30T23:59' for datetime-local
          const date = new Date(data.countdown_deadline);
          if (!isNaN(date.getTime())) {
            // Convert back to local ISO string slice for input
            setCountdownDeadline(new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16));
          }
        }
      }
    } catch (err: any) {
      console.warn('Could not load campaign config from Supabase, loading local:', err.message);
      loadLocalConfig();
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const supabase = getSupabase();
    if (supabase) {
      setIsSupabase(true);
      fetchCampaignConfig(supabase);
    } else {
      setIsSupabase(false);
      loadLocalConfig();
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const processFile = (file: File) => {
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setErrorMsg('Formato de imagem inválido. Use PNG, JPG ou WEBP.');
      return;
    }

    setErrorMsg('');
    setCoverFile(file);

    const reader = new FileReader();
    reader.onloadend = () => {
      setCoverPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

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
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  const removeCoverFile = () => {
    setCoverFile(null);
    setCoverPreview(null);
    if (coverInputRef.current) {
      coverInputRef.current.value = '';
    }
  };

  // Upload Cover Image directly to bucket "comprovantes" under subfolder cover-images/
  const uploadCoverToSupabase = async (file: File): Promise<string | null> => {
    const supabase = getSupabase();
    if (!supabase) return null;

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `cover-${Date.now()}.${fileExt}`;
      const filePath = `covers/${fileName}`;

      const { data, error } = await supabase.storage
        .from('comprovantes')
        .upload(filePath, file, { cacheControl: '3600', upsert: true });

      if (error) {
        throw error;
      }

      const { data: publicData } = supabase.storage
        .from('comprovantes')
        .getPublicUrl(filePath);

      return publicData.publicUrl;
    } catch (err: any) {
      throw new Error(`Falha ao carregar arquivo de capa: ${err.message}`);
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg('');
    setErrorMsg('');

    if (!title.trim()) {
      setErrorMsg('O título da campanha não pode ficar em branco.');
      return;
    }

    const parsedGoal = parseFloat(goalStr.replace(',', '.'));
    if (isNaN(parsedGoal) || parsedGoal <= 0) {
      setErrorMsg('Insira um valor de meta válido maior que zero.');
      return;
    }

    setIsSaving(true);
    let finalImageUrl = imageUrl;

    try {
      const supabase = getSupabase();

      // Handle real file upload to comprovantes bucket
      if (coverFile) {
        if (isSupabase && supabase) {
          const uploadedUrl = await uploadCoverToSupabase(coverFile);
          if (uploadedUrl) {
            finalImageUrl = uploadedUrl;
            setImageUrl(uploadedUrl);
          }
        } else {
          // Fallback Local Storage base64
          finalImageUrl = coverPreview || imageUrl;
          setImageUrl(finalImageUrl);
        }
      }

      if (isSupabase && supabase) {
        const configData = {
          id: 1,
          title: title.trim(),
          description: description.trim(),
          goal: parsedGoal,
          image_url: finalImageUrl,
          pix_key: pixKey.trim(),
          pix_holder: pixHolder.trim(),
          pix_bank: pixBank.trim(),
          is_countdown_active: isCountdownActive,
          countdown_deadline: countdownDeadline ? new Date(countdownDeadline).toISOString() : null
        };

        const { error } = await supabase
          .from('campaign_config')
          .upsert(configData, { onConflict: 'id' });

        if (error) {
          throw error;
        }

        // Save local copy too just in case
        localStorage.setItem('campaign_title', title.trim());
        localStorage.setItem('campaign_description', description.trim());
        localStorage.setItem('campaign_goal', parsedGoal.toString());
        localStorage.setItem('campaign_image_url', finalImageUrl);
        localStorage.setItem('campaign_pix_key', pixKey.trim());
        localStorage.setItem('campaign_pix_holder', pixHolder.trim());
        localStorage.setItem('campaign_pix_bank', pixBank.trim());
        localStorage.setItem('campaign_is_countdown_active', isCountdownActive.toString());
        if (countdownDeadline) localStorage.setItem('campaign_countdown_deadline', countdownDeadline);

        setSuccessMsg('Configurações atualizadas na nuvem com sucesso!');
        setCoverFile(null);
        setCoverPreview(null);
      } else {
        localStorage.setItem('campaign_title', title.trim());
        localStorage.setItem('campaign_description', description.trim());
        localStorage.setItem('campaign_goal', parsedGoal.toString());
        localStorage.setItem('campaign_image_url', finalImageUrl);
        localStorage.setItem('campaign_pix_key', pixKey.trim());
        localStorage.setItem('campaign_pix_holder', pixHolder.trim());
        localStorage.setItem('campaign_pix_bank', pixBank.trim());
        localStorage.setItem('campaign_is_countdown_active', isCountdownActive.toString());
        if (countdownDeadline) localStorage.setItem('campaign_countdown_deadline', countdownDeadline);

        setSuccessMsg('Configurações salvas localmente com sucesso!');
        setCoverFile(null);
        setCoverPreview(null);
      }
    } catch (err: any) {
      console.error('Save config error:', err);
      setErrorMsg(`Erro ao salvar: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20 font-sans antialiased text-slate-800">
      <div className="absolute top-0 inset-x-0 h-96 bg-gradient-to-b from-indigo-50/50 to-transparent pointer-events-none" />

      <main className="relative max-w-xl mx-auto px-4 pt-8">
        
        {/* HEADER BRAND */}
        <header className="flex flex-col items-center text-center mb-6">
          <Link href="/" className="inline-flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 rounded-full text-xs font-semibold shadow-sm transition-all mb-4">
            <ArrowLeft className="w-3.5 h-3.5" />
            Voltar para a Vaquinha
          </Link>

          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 md:text-3xl flex items-center gap-2">
            <Settings className="w-8 h-8 text-indigo-600" />
            Painel de Controle
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Configure informações cruciais da campanha sincronizadas no Supabase.
          </p>
        </header>

        {/* LOADING SCREEN */}
        {isLoading ? (
          <div className="bg-white border border-slate-100 rounded-3xl p-12 text-center flex flex-col items-center justify-center gap-2 shadow-sm">
            <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-semibold text-slate-500">Buscando configurações...</p>
          </div>
        ) : (
          <div className="space-y-6">
            
            {/* CONFIGURATION FORM */}
            <section className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
              <h2 className="text-base font-extrabold text-slate-800 mb-4 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-500" />
                Dados da Vaquinha
              </h2>

              <form onSubmit={handleSaveConfig} className="space-y-5">
                <div>
                  <label htmlFor="config-title" className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Título da Campanha
                  </label>
                  <input 
                    id="config-title"
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ex: Vaquinha do Microfone"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-semibold"
                  />
                </div>

                <div>
                  <label htmlFor="config-description" className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Descrição/Subtítulo
                  </label>
                  <textarea 
                    id="config-description"
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Escreva sobre o objetivo da vaquinha..."
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-600 leading-relaxed"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="config-goal" className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                      Meta de Arrecadação (R$)
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <span className="text-slate-400 text-sm font-semibold">R$</span>
                      </div>
                      <input 
                        id="config-goal"
                        type="text"
                        value={goalStr}
                        onChange={(e) => setGoalStr(e.target.value)}
                        placeholder="Ex: 500.00"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-bold"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="config-image-url" className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                      URL da Imagem da Capa
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                        <ImageIcon className="w-4 h-4 text-slate-400" />
                      </div>
                      <input 
                        id="config-image-url"
                        type="text"
                        value={imageUrl}
                        onChange={(e) => setImageUrl(e.target.value)}
                        placeholder="/lark-microphone.jpg"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all inline-code text-slate-600"
                      />
                    </div>
                  </div>
                </div>

                {/* PIX INFO */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label htmlFor="config-pix-key" className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                      Chave PIX
                    </label>
                    <input 
                      id="config-pix-key"
                      type="text"
                      value={pixKey}
                      onChange={(e) => setPixKey(e.target.value)}
                      placeholder="Chave (CPF, e-mail, etc)"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-semibold"
                    />
                  </div>
                  <div>
                    <label htmlFor="config-pix-holder" className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                      Titular do PIX
                    </label>
                    <input 
                      id="config-pix-holder"
                      type="text"
                      value={pixHolder}
                      onChange={(e) => setPixHolder(e.target.value)}
                      placeholder="Nome Completo"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-semibold"
                    />
                  </div>
                  <div>
                    <label htmlFor="config-pix-bank" className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                      Banco Recebedor
                    </label>
                    <input 
                      id="config-pix-bank"
                      type="text"
                      value={pixBank}
                      onChange={(e) => setPixBank(e.target.value)}
                      placeholder="Ex: Nubank, Inter..."
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-semibold"
                    />
                  </div>
                </div>

                {/* COUNTDOWN SETTINGS */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 border border-slate-100 rounded-2xl p-4">
                  <div className="flex flex-col justify-center">
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Temporizador Regressivo
                    </label>
                    <p className="text-[10px] text-slate-400 mb-3">Ative para mostrar uma contagem na página principal.</p>
                    
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer" 
                        checked={isCountdownActive}
                        onChange={(e) => setIsCountdownActive(e.target.checked)}
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                      <span className="ml-3 text-xs font-bold text-slate-700">
                        {isCountdownActive ? 'Ativado' : 'Desativado'}
                      </span>
                    </label>
                  </div>
                  <div>
                    <label htmlFor="config-countdown" className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                      Data e Hora Limite
                    </label>
                    <input 
                      id="config-countdown"
                      type="datetime-local"
                      disabled={!isCountdownActive}
                      value={countdownDeadline}
                      onChange={(e) => setCountdownDeadline(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-semibold disabled:bg-slate-100 disabled:text-slate-400"
                    />
                  </div>
                </div>

                {/* Cover File Upload Uploader */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Modificar Capa (Fazer Upload p/ Comprovantes)
                  </label>
                  <div 
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => coverInputRef.current?.click()}
                    className={`relative border-2 border-dashed rounded-2xl p-5 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-250 ${
                      isDragOver
                        ? 'border-indigo-500 bg-indigo-50/50'
                        : coverFile
                          ? 'border-emerald-300 bg-emerald-50/10'
                          : 'border-slate-200 hover:border-indigo-400 hover:bg-slate-50/40'
                    }`}
                  >
                    <input 
                      ref={coverInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />

                    {coverFile ? (
                      <div className="space-y-2">
                        <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600">
                          <FileCheck className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-800 line-clamp-1 max-w-[240px] mx-auto">
                            {coverFile.name}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {(coverFile.size / 1024).toFixed(1)} KB • Nova imagem de capa
                          </p>
                        </div>
                        
                        {coverPreview && (
                          <div className="relative w-24 h-14 rounded-lg border border-slate-150 overflow-hidden mx-auto shadow-sm">
                            <img src={coverPreview} alt="Preview da capa" className="w-full h-full object-cover" />
                          </div>
                        )}

                        <button 
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeCoverFile();
                          }}
                          className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors border border-rose-100/30"
                        >
                          <X className="w-3 h-3" />
                          Limpar arquivo
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-500 flex items-center justify-center mx-auto border border-indigo-150">
                          <Upload className="w-4.5 h-4.5" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-700">
                            Arraste nova capa aqui ou <span className="text-indigo-600 font-extrabold">clique para selecionar</span>
                          </p>
                          <p className="text-[10px] text-slate-400 mt-1">
                            Salva diretamente no bucket de mídia do Supabase
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {successMsg && (
                  <p className="text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-xl p-3 flex items-center gap-1.5 animate-pulse">
                    <CheckCircle className="w-4.5 h-4.5 text-emerald-500 shrink-0" />
                    {successMsg}
                  </p>
                )}

                {errorMsg && (
                  <p className="text-xs font-semibold text-rose-500 bg-rose-50 border border-rose-100 rounded-xl p-3 flex items-center gap-1.5 animate-pulse">
                    <AlertCircle className="w-4.5 h-4.5 text-rose-400 shrink-0" />
                    {errorMsg}
                  </p>
                )}

                <div className="flex gap-3">
                  <Link 
                    href="/"
                    className="flex-1 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-xl text-sm transition-all hover:border-slate-350 text-center flex items-center justify-center"
                  >
                    Cancelar
                  </Link>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className={`flex-1 text-white py-2.5 px-4 rounded-xl text-sm font-bold shadow-md active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer ${
                      isSaving
                        ? 'bg-indigo-400 cursor-not-allowed'
                        : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/10'
                    }`}
                  >
                    {isSaving ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        Salvar Alterações
                      </>
                    )}
                  </button>
                </div>
              </form>
            </section>
          </div>
        )}

        {/* ADMIN FOOTER */}
        <footer className="mt-8 pb-8 text-center flex justify-center">
          <Link 
            href="/" 
            className="inline-flex items-center gap-2 px-4 py-2 bg-transparent hover:bg-slate-100 border border-slate-200/60 text-slate-500 hover:text-slate-700 rounded-full text-xs font-bold transition-all"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Voltar para a Vaquinha
          </Link>
        </footer>
      </main>
    </div>
  );
}
