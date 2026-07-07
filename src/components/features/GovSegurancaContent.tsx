import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  ShieldCheck, 
  Scan, 
  Search, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  Sliders, 
  Eye, 
  Trash2, 
  UserSquare, 
  FileLock2, 
  Fingerprint, 
  TrendingUp, 
  HelpCircle 
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip 
} from 'recharts';

// Data trend for authentication attempts
const BIOMETRIC_ATTEMPTS_DATA = [
  { day: 'Seg', sucesso: 1240, falhas: 5 },
  { day: 'Ter', sucesso: 1450, falhas: 8 },
  { day: 'Qua', sucesso: 1680, falhas: 12 },
  { day: 'Qui', sucesso: 1590, falhas: 4 },
  { day: 'Sex', sucesso: 1890, falhas: 18 },
  { day: 'Sáb', sucesso: 1120, falhas: 2 },
  { day: 'Dom', sucesso: 980, falhas: 1 },
];

interface BiometricUser {
  id: string;
  name: string;
  docId: string;
  type: 'Cidadão' | 'Instituição';
  institutionName?: string;
  registeredAt: string;
  lastUsed: string;
  status: 'Ativo' | 'Pendente' | 'Bloqueado';
  confidenceRate: number;
}

export interface GovSegurancaContentProps {
  emergencyMode?: boolean;
  onToggleEmergencyMode?: (enabled: boolean) => void;
}

export function GovSegurancaContent({
  emergencyMode = false,
  onToggleEmergencyMode
}: GovSegurancaContentProps = {}) {
  const [biometricUsers, setBiometricUsers] = useState<BiometricUser[]>([
    { id: '1', name: 'Edlasio Galhardo', docId: '003291820LA045', type: 'Cidadão', registeredAt: '12/02/2026', lastUsed: 'Hoje, 20:15', status: 'Ativo', confidenceRate: 98.8 },
    { id: '2', name: 'Dr. Afonso Henriques', docId: '005481920NA011', type: 'Instituição', institutionName: 'Ministério das Finanças (MINFIN)', registeredAt: '03/03/2026', lastUsed: 'Hoje, 18:42', status: 'Ativo', confidenceRate: 99.4 },
    { id: '3', name: 'AGT Angola Admin', docId: '009182390LA112', type: 'Instituição', institutionName: 'Administração Geral Tributária', registeredAt: '15/01/2026', lastUsed: 'Ontem, 14:10', status: 'Ativo', confidenceRate: 97.6 },
    { id: '4', name: 'Emanuel Garcia', docId: '004128911LA092', type: 'Cidadão', registeredAt: '08/04/2026', lastUsed: '19/05/2026', status: 'Pendente', confidenceRate: 85.2 },
    { id: '5', name: 'Isabel de Sousa', docId: '002910398HU034', type: 'Cidadão', registeredAt: '22/03/2026', lastUsed: '15/05/2026', status: 'Bloqueado', confidenceRate: 0.0 },
    { id: '6', name: 'Cláudia Simões', docId: '006129837BA029', type: 'Cidadão', registeredAt: '19/04/2026', lastUsed: 'Hoje, 10:24', status: 'Ativo', confidenceRate: 96.5 },
  ]);

  // Sync Edlasio's status based on emergencyMode
  React.useEffect(() => {
    setBiometricUsers(prev => prev.map(u => {
      if (u.name === 'Edlasio Galhardo') {
        return { ...u, status: emergencyMode ? 'Bloqueado' : 'Ativo' };
      }
      return u;
    }));
  }, [emergencyMode]);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'Todos' | 'Cidadão' | 'Instituição'>('Todos');
  const [matchingThreshold, setMatchingThreshold] = useState(85);
  const [antiSpoofingEnforced, setAntiSpoofingEnforced] = useState(true);
  const [selectedUser, setSelectedUser] = useState<BiometricUser | null>(null);
  const [simulatedScanResult, setSimulatedScanResult] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [activeTab, setActiveTab] = useState<'metrics' | 'users' | 'config'>('metrics');

  const filteredUsers = biometricUsers.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          user.docId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'Todos' || user.type === filterType;
    return matchesSearch && matchesType;
  });

  const handleStatusChange = (userId: string, newStatus: 'Ativo' | 'Pendente' | 'Bloqueado') => {
    setBiometricUsers(prev => prev.map(u => u.id === userId ? { ...u, status: newStatus } : u));
    if (selectedUser?.id === userId) {
      setSelectedUser(prev => prev ? { ...prev, status: newStatus } : null);
    }
  };

  const handleRequestRecalibration = (userId: string) => {
    setBiometricUsers(prev => prev.map(u => u.id === userId ? { ...u, status: 'Pendente' } : u));
    alert('Solicitação de recadastramento facial lançada para o utilizador.');
  };

  const startAnalysisSimulation = (user: BiometricUser) => {
    setIsScanning(true);
    setSimulatedScanResult(null);
    setTimeout(() => {
      setIsScanning(false);
      const randomRate = +(85 + Math.random() * 15).toFixed(1);
      if (randomRate >= matchingThreshold) {
        setSimulatedScanResult(`Match Biométrico Confirmado! Confiança de ${randomRate}% para ${user.name}. Integridade garantida (Anti-Spoofing: Passou)`);
      } else {
        setSimulatedScanResult(`Falha no Match. Confiança de ${randomRate}% está abaixo do limite mínimo configurado (${matchingThreshold}%).`);
      }
    }, 1800);
  };

  return (
    <div className="pb-24">
      {/* Title Header Section */}
      <div className="mb-12">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white">
            <ShieldCheck size={16} />
          </div>
          <span className="font-mono text-xs font-black uppercase text-indigo-650 tracking-[0.2em]">
            Admin &bull; Segurança Facial Integrada
          </span>
        </div>
        <h1 className="text-3xl md:text-5xl font-black text-slate-950 tracking-tighter italic uppercase leading-none">
          Segurança Facial
        </h1>
        <p className="text-slate-500 font-medium text-xs mt-2 max-w-2xl">
          Painel central de gestão biométrica facial. Controle integridade de acessos, revise validações de autenticação e defina limiares de acurácia de matching em tempo real para Cidadãos e Instituições.
        </p>
      </div>

      {/* SOC-AN-2026 Emergency Protocol Card */}
      <div className={`mb-8 p-6 rounded-[32px] border ${
        emergencyMode 
          ? 'bg-red-500/10 border-red-500/20 text-slate-800' 
          : 'bg-[#0c2340] border-[#0c2340]/20 text-white'
      } transition-all duration-300 flex flex-col md:flex-row items-start md:items-center justify-between gap-6`}>
        <div className="flex items-start gap-4">
          <div className={`p-4 rounded-2xl shrink-0 ${
            emergencyMode ? 'bg-red-600 text-white animate-pulse' : 'bg-[#091b31] text-white'
          }`}>
            <AlertTriangle size={24} />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className={`inline-block px-2.5 py-0.5 rounded-full text-[9px] font-black tracking-widest uppercase ${
                emergencyMode ? 'bg-red-200 text-red-800 animate-pulse' : 'bg-white/25 text-white'
              }`}>
                PROTOCOL SOC-AN-2026
              </span>
              <span className={`w-1.5 h-1.5 rounded-full ${emergencyMode ? 'bg-slate-450' : 'bg-white/30'}`} />
              <span className={`text-[10px] font-mono font-bold uppercase ${emergencyMode ? 'text-slate-500' : 'text-slate-300'}`}>Sovereignty Shield</span>
            </div>
            <h3 className={`text-base font-black uppercase tracking-tight leading-none italic font-sans mt-1 ${emergencyMode ? 'text-slate-900' : 'text-white'}`}>
              Interrupção de Emergência Cibernética
            </h3>
            <p className={`text-[11px] leading-relaxed max-w-xl mt-1 ${emergencyMode ? 'text-slate-500' : 'text-slate-300'}`}>
              Quando ativado, suspende imediatamente a biometria de "Edlasio Galhardo", assinala bloqueio identitário temporário para salvaguarda de soberania digital, propaga notificações nos canais governamentais e encripta as chaves criptográficas.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            if (onToggleEmergencyMode) {
              onToggleEmergencyMode(!emergencyMode);
            }
          }}
          className={`shrink-0 w-full md:w-auto px-6 py-4.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all hover:scale-[1.01] active:scale-95 select-none border-0 cursor-pointer ${
            emergencyMode 
              ? 'bg-red-600 hover:bg-red-700 text-white' 
              : 'bg-blue-900 hover:bg-blue-800 text-white'
          }`}
        >
          {emergencyMode ? 'DESATIVAR PROTOCOLO SOC' : 'ATIVAR PROTOCOLO SOC-AN-2026'}
        </button>
      </div>

      {/* Interactive Navigation/Categories TabBar */}
      <div className="flex flex-wrap md:flex-nowrap bg-white p-1.5 rounded-[22px] max-w-3xl mb-8 border border-slate-200">
        {[
          { id: 'metrics', label: 'Métricas e Tráfego', icon: TrendingUp },
          { id: 'users', label: 'Modelos de Utilizadores', icon: UserSquare, count: filteredUsers.length },
          { id: 'config', label: 'Parâmetros e Consola', icon: Sliders }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer border select-none ${
                isActive 
                  ? 'bg-[#0E2B64] text-white font-black border-[#0E2B64]' 
                  : 'text-slate-500 hover:text-slate-800 bg-transparent hover:bg-slate-200/40 border-transparent'
              }`}
            >
              <Icon size={14} className={isActive ? 'text-white' : 'text-slate-400'} />
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold ${
                  isActive ? 'bg-white/20 text-white' : 'bg-slate-200/80 text-slate-600'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Contents */}
      {activeTab === 'metrics' && (
        <motion.div
          key="metrics"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="space-y-8"
        >
          {/* Top Quick Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Total Faces */}
            <div className="bg-white border border-slate-200 p-6 rounded-3xl">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase">Modelos Faciais Registados</p>
                  <h3 className="text-2xl font-black mt-2 text-slate-800">15,240</h3>
                  <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-0.5 mt-1">
                    <CheckCircle2 size={11} /> +12.4% este mês
                  </span>
                </div>
                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                  <Scan size={20} />
                </div>
              </div>
            </div>

            {/* Accuracy Rate */}
            <div className="bg-white border border-slate-200 p-6 rounded-3xl">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase">Acurácia Média de Match</p>
                  <h3 className="text-2xl font-black mt-2 text-indigo-655">98.67%</h3>
                  <span className="text-[10px] font-mono text-slate-450 mt-1 block font-bold">
                    Falsa Aceitação: 0.001%
                  </span>
                </div>
                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                  <ShieldCheck size={20} />
                </div>
              </div>
            </div>

            {/* Failed Attempts Blocked */}
            <div className="bg-white border border-slate-200 p-6 rounded-3xl">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase">Fraudes de Spoofing Bloqueadas</p>
                  <h3 className="text-2xl font-black mt-2 text-red-655">48</h3>
                  <span className="text-[10px] font-bold text-red-600 flex items-center gap-0.5 mt-1 animate-pulse">
                    <AlertTriangle size={11} /> 2 tentativas hoje
                  </span>
                </div>
                <div className="p-3 bg-red-50 text-red-600 rounded-2xl">
                  <Eye size={20} />
                </div>
              </div>
            </div>

            {/* Threshold Status */}
            <div className="bg-white border border-slate-200 p-6 rounded-3xl">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase">Limiar de Validade Face ID</p>
                  <h3 className="text-2xl font-black mt-2 text-slate-800">{matchingThreshold}%</h3>
                  <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-0.5 mt-1">
                    Liveness Enforcement: Ativo
                  </span>
                </div>
                <div className="p-3 bg-slate-50 text-slate-600 rounded-2xl">
                  <Sliders size={20} />
                </div>
              </div>
            </div>
          </div>

          {/* Graphical Trends Section mimicking General User style - also full width */}
          <div className="bg-white border border-slate-200 rounded-[32px] p-6 md:p-8">
            <div className="flex justify-between items-start mb-6">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
                  <span className="font-mono text-[9px] font-black uppercase tracking-widest text-indigo-650">
                    Sincronização de Tráfego de Autenticação
                  </span>
                </div>
                <h4 className="text-xl md:text-2xl font-black italic tracking-tighter uppercase text-slate-950">
                  Tentativas de Acesso por Biometria
                </h4>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block font-sans">Média Semanal de Sucesso</span>
                <span className="text-xl font-bold tracking-tight text-emerald-600">99.1%</span>
              </div>
            </div>

            <div className="h-[220px] w-full min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={BIOMETRIC_ATTEMPTS_DATA} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorSucesso" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#818cf8" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#818cf8" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="day" stroke="#94a3b8" fontSize={9} fontWeight="bold" tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={9} fontWeight="bold" tickLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '11px', fontFamily: 'monospace' }} 
                  />
                  <Area type="monotone" name="Sucesso" dataKey="sucesso" stroke="#4f46e5" strokeWidth={2} fillOpacity={1} fill="url(#colorSucesso)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </motion.div>
      )}

      {activeTab === 'users' && (
        <motion.div
          key="users"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
          {/* Users table / list with filters - now taking full width */}
          <div className="bg-white border border-slate-200 rounded-[32px] p-6 md:p-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-6 border-b border-slate-50">
              <div>
                <h3 className="text-base font-black tracking-tighter text-slate-900 uppercase">Utilizadores Cadastrados</h3>
                <p className="text-[11px] text-slate-400 mt-1 font-medium">Controlo individual de login biométrico para cidadãos e administradores institucionais.</p>
              </div>

              {/* View filters */}
              <div className="flex flex-wrap items-center gap-2">
                {(['Todos', 'Cidadão', 'Instituição'] as const).map(type => (
                  <button
                    key={type}
                    onClick={() => setFilterType(type)}
                    className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer border-0 ${
                      filterType === type 
                        ? 'bg-indigo-600 text-white' 
                        : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    {type}s
                  </button>
                ))}
              </div>
            </div>

            {/* Filter Input Search bar */}
            <div className="relative mb-6">
              <Search className="absolute left-4 top-3.5 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Pesquise por nome, n.º do BI ou instituição..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-11 pr-4 py-3 border border-slate-100 rounded-2xl text-xs font-semibold outline-none focus:border-indigo-600 bg-slate-50"
              />
            </div>

            {/* Beautiful tabular list layout replacing the card grid */}
            {filteredUsers.length > 0 ? (
              <div className="overflow-auto rounded-[24px] bg-slate-50/20 custom-scrollbar max-h-[600px] border border-slate-200">
                <table className="mobile-data-table w-full text-left border-collapse min-w-[1000px]">
                  <thead className="sticky top-0 z-10 bg-blue-950 text-white text-[10px] font-black uppercase tracking-widest">
                    <tr>
                      <th className="py-4 px-5 rounded-l-2xl">Utilizador / Tipo</th>
                      <th className="py-4 px-5">Documento BI</th>
                      <th className="py-4 px-5">Instituição / Departamento</th>
                      <th className="py-4 px-5">Cadastrado em</th>
                      <th className="py-4 px-5">Acurácia IA</th>
                      <th className="py-4 px-5">Último Acesso</th>
                      <th className="py-4 px-5 text-center">Estado</th>
                      <th className="py-4 px-5 text-center rounded-r-2xl">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white">
                    {filteredUsers.map(user => (
                      <tr 
                        key={user.id} 
                        onClick={() => setSelectedUser(user)}
                        className={`text-xs text-[#334155] border-b border-slate-100 last:border-b-0 transition-all cursor-pointer ${
                          selectedUser?.id === user.id ? 'bg-indigo-50/80 hover:bg-indigo-50/90 font-semibold' : 'bg-white hover:bg-slate-50/60'
                        }`}
                      >
                        <td className="py-4 px-5 font-bold text-slate-900">
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                              user.status === 'Bloqueado' 
                                ? 'bg-rose-50 text-rose-600 border border-rose-100' 
                                : 'bg-indigo-50 text-indigo-755 border border-indigo-100'
                            }`}>
                              <UserSquare size={16} />
                            </div>
                            <div className="min-w-0">
                              <span className="font-display font-black text-slate-900 block uppercase leading-none">{user.name}</span>
                              <span className={`inline-block text-[8.5px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded leading-none mt-1.5 ${
                                user.type === 'Instituição' 
                                  ? 'bg-amber-50 text-amber-705 border border-amber-100' 
                                  : 'bg-emerald-50 text-emerald-750 border border-emerald-100'
                              }`}>
                                {user.type}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-5 font-mono text-slate-605 font-semibold">
                          {user.docId}
                        </td>
                        <td className="py-4 px-5 font-bold text-slate-700">
                          {user.institutionName ? (
                            <span className="truncate block max-w-[220px]" title={user.institutionName}>
                              {user.institutionName}
                            </span>
                          ) : (
                            <span className="text-slate-350 italic font-medium">Pessoal (Cidadão)</span>
                          )}
                        </td>
                        <td className="py-4 px-5 font-bold text-slate-500">
                          {user.registeredAt}
                        </td>
                        <td className="py-4 px-5 font-mono font-black text-emerald-600">
                          {user.confidenceRate > 0 ? `${user.confidenceRate}%` : '\u2014'}
                        </td>
                        <td className="py-4 px-5 text-slate-500 font-bold">
                          {user.lastUsed}
                        </td>
                        <td className="py-4 px-5 text-center">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] uppercase font-black tracking-wider border select-none ${
                            user.status === 'Ativo' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                            user.status === 'Pendente' ? 'bg-amber-50 text-amber-700 border-amber-100' : 'bg-rose-50 text-rose-700 border-rose-100'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              user.status === 'Ativo' ? 'bg-emerald-500 animate-pulse' :
                              user.status === 'Pendente' ? 'bg-amber-500' : 'bg-rose-500'
                            }`} />
                            {user.status}
                          </span>
                        </td>
                        <td className="py-4 px-5 text-center">
                          <div className="flex items-center justify-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                            {user.status === 'Bloqueado' ? (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStatusChange(user.id, 'Ativo');
                                }}
                                className="py-1 px-2.5 bg-white border border-slate-200 hover:border-slate-450 rounded-lg text-slate-655 hover:text-slate-950 text-[9.5px] font-black uppercase tracking-wider cursor-pointer transition-colors"
                              >
                                Reativar
                              </button>
                            ) : (
                              <>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRequestRecalibration(user.id);
                                  }}
                                  className="py-1 px-2.5 bg-white border border-slate-200 hover:border-slate-450 rounded-lg text-slate-655 hover:text-slate-950 text-[9.5px] font-black uppercase tracking-wider cursor-pointer transition-colors"
                                  title="Solicitar Recadastramento de Face ID"
                                >
                                  Recalibrar
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleStatusChange(user.id, 'Bloqueado');
                                  }}
                                  className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-slate-200 rounded-lg cursor-pointer transition-colors"
                                  title="Bloquear Acesso por Face ID"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-12 text-center bg-white border border-slate-200 rounded-[32px] text-slate-400 text-xs font-semibold uppercase tracking-wider">
                Nenhum utilizador encontrado com os filtros atuais.
              </div>
            )}
          </div>
        </motion.div>
      )}

      {activeTab === 'config' && (
        <motion.div
          key="config"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
          {/* Top Configuration & Simulation grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Configurations Card */}
            <div className="bg-white border border-slate-200 rounded-[32px] p-6">
              <h3 className="text-sm font-black tracking-widest text-slate-800 uppercase mb-4 flex items-center gap-2">
                <Sliders size={16} className="text-indigo-600" />
                Parâmetros Ativos
              </h3>

              <div className="space-y-5">
                {/* Confident match slider */}
                <div>
                  <div className="flex justify-between text-xs font-bold text-slate-700 mb-1.5">
                    <span>Sensibilidade do Match Facial</span>
                    <span className="text-indigo-600 font-black">{matchingThreshold}%</span>
                  </div>
                  <input 
                    type="range" 
                    min="75" 
                    max="99" 
                    value={matchingThreshold} 
                    onChange={(e) => setMatchingThreshold(+e.target.value)}
                    className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />
                  <p className="text-[10px] text-slate-400 font-medium mt-1">
                    Valores elevados minimizam fraudes mas podem elevar falsas rejeições sob baixa iluminação.
                  </p>
                </div>

                {/* Anti Spoofing Switch */}
                <div className="flex items-center justify-between py-2 border-t border-slate-50">
                  <div>
                    <label htmlFor="anti-spoofing" className="text-xs font-bold text-slate-700 block select-none">Detecção de Vivicidade (Liveness)</label>
                    <span className="text-[10px] text-slate-400 font-medium">Requer micro-movimentos do piscar de olhos.</span>
                  </div>
                  <button
                    id="anti-spoofing"
                    onClick={() => setAntiSpoofingEnforced(!antiSpoofingEnforced)}
                    className={`w-11 h-6 rounded-full transition-colors flex items-center px-1 shrink-0 ${
                      antiSpoofingEnforced ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-slate-200'
                    }`}
                  >
                    <span className={`w-4 h-4 rounded-full bg-white transition-transform ${antiSpoofingEnforced ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>

                {/* Encryption */}
                <div className="border-t border-slate-50 pt-3">
                  <span className="text-[10px] font-black tracking-widest text-indigo-600 uppercase block mb-1">Criptografia de Vetores</span>
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <FileLock2 size={14} className="text-slate-500" />
                    AES-GCM 256 + Hash SHA3
                  </span>
                  <p className="text-[10px] text-slate-400 font-medium mt-1">
                    Os dados faciais não são armazenados como fotos, mas sim de forma irreversível como vetores de pontos matemáticos encriptados.
                  </p>
                </div>
              </div>
            </div>

            {/* Real-time simulation playground */}
            <div className="bg-white text-slate-800 border border-slate-200 rounded-[32px] p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-5 text-slate-400">
                <Scan size={180} />
              </div>

              <h3 className="text-xs font-black tracking-widest text-slate-500 uppercase mb-3 flex items-center gap-2">
                <Fingerprint size={16} className="text-indigo-600" />
                Consola de Teste de Match
              </h3>
              
              <p className="text-[11px] text-slate-500 leading-relaxed mb-4 font-medium">
                Selecione qualquer utilizador na lista ("Modelos de Utilizadores" tab) e depois execute o diagnóstico na consola abaixo.
              </p>

              {selectedUser ? (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-4">
                  <div className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1">{selectedUser.type}</div>
                  <div className="text-sm font-bold text-slate-900">{selectedUser.name}</div>
                  <div className="text-[10px] font-mono text-slate-500 mt-0.5">BI: {selectedUser.docId}</div>
                </div>
              ) : (
                <div className="border border-dashed border-slate-200 rounded-2xl p-4 py-6 text-center text-xs text-slate-400 mb-4 font-bold">
                  Dica: Se preferir outro utilizador, selecione-o antes na lista da aba principal.
                </div>
              )}

              <button 
                disabled={!selectedUser || isScanning}
                onClick={() => selectedUser && startAnalysisSimulation(selectedUser)}
                className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-100 disabled:text-slate-400 text-white font-bold py-3 px-4 rounded-xl text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer border-0"
              >
                {isScanning ? (
                  <>
                    <RefreshCw className="animate-spin" size={14} />
                    Mapeando Vetores Faciais...
                  </>
                ) : (
                  <>
                    <Scan size={14} />
                    Executar Teste Biométrico {selectedUser ? `para ${selectedUser.name.split(' ')[0]}` : ''}
                  </>
                )}
              </button>

              {simulatedScanResult && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={`mt-4 p-3.5 rounded-xl border text-[11px] font-mono leading-relaxed ${
                    simulatedScanResult.includes('Confirmado') 
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                      : 'bg-rose-50 border-rose-200 text-rose-800'
                  }`}
                >
                  {simulatedScanResult}
                </motion.div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
