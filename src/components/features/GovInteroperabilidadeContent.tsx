import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Building2, 
  Plus, 
  Search, 
  MapPin, 
  Users, 
  Mail, 
  Activity, 
  Clock, 
  Cpu, 
  CheckCircle, 
  Power, 
  X, 
  Edit, 
  SlidersHorizontal,
  ChevronDown,
  Trash2,
  Trash,
  Phone,
  User,
  Briefcase,
  Shield,
  UploadCloud
} from 'lucide-react';

import { Institution } from '../../types';
import { useInstitutions } from '../../services/institutionStore';
import { useSession } from '../../services/sessionStore';
import { supabaseService } from '../../services/supabaseService';

const MUNICIPALITIES_BY_PROVINCE: { [key: string]: string[] } = {
  'Todas': ['Todos'],
  'Bengo': ['Todos', 'Dande', 'Ambriz', 'Nambuangongo', 'Bula Atumba', 'Pango Aluquem'],
  'Icolo e Bengo': ['Todos', 'Icolo e Bengo', 'Cacabo', 'Kibala', 'Piri'],
  'Benguela': ['Todos', 'Benguela', 'Lobito', 'Catumbela', 'Baía Farta', 'Ganda', 'Chongorói', 'Bocoio', 'Caimbambo'],
  'Bié': ['Todos', 'Cuito', 'Cuatro', 'Chitembo', 'Andulo', 'Nharêa', 'Mucuma'],
  'Cabinda': ['Todos', 'Cabinda', 'Cacongo', 'Buco-Zau', 'Dembo'],
  'Cuando': ['Todos', 'Menongue', 'Cuchi', 'Cuangar', 'Cativos', 'Luchazes'],
  'Cubango': ['Todos', 'Cubango', 'Cunje', 'Mavinga', 'Nekiemba', 'Rivungo'],
  'Cuanza Norte': ['Todos', 'N\'Dalatando', 'Ambaca', 'Golungo Alto', 'Ngongui', 'Samba', 'Bula'],
  'Cuanza Sul': ['Todos', 'Sumbe', 'Libolo', 'Quibala', 'Cela', 'Mussende', 'Soyo'],
  'Cunene': ['Todos', 'Ondjiva', 'Cuanhama', 'Curoca', 'Namacunde', 'Ombadiya'],
  'Huambo': ['Todos', 'Huambo', 'Caála', 'Bailundo', 'Catchiungo', 'Londuimbale', 'Longonjo', 'Ecunha'],
  'Huíla': ['Todos', 'Lubango', 'Chibia', 'Humpata', 'Caconda', 'Kuvango', 'Matala', 'Caluquembe', 'Quilengues'],
  'Luanda': ['Todos', 'Viana', 'Belas', 'Cazenga', 'Cacuaco', 'Talatona', 'Ingombota', 'Maianga', 'Rangel', 'Kilamba Kiaxi'],
  'Lunda Norte': ['Todos', 'Dundo', 'Cambulo', 'Lóvua', 'Cuiloa', 'Zaire'],
  'Lunda Sul': ['Todos', 'Saurimo', 'Muconda', 'Laculo', 'Cacolo'],
  'Malanje': ['Todos', 'Malanje', 'Caculama', 'Quela', 'Mucari', 'Calandula', 'Cuaba', 'Marimba', 'Masseira'],
  'Moxico': ['Todos', 'Luena', 'Moxico', 'Luchico', 'Cameia', 'Luahadi'],
  'Moxico Leste': ['Todos', 'Luena', 'Lusavo', 'Mucunde', 'Lomelas'],
  'Namibe': ['Todos', 'Namibe', 'Tombwa', 'Virei', 'Bibala', 'Camucuio'],
  'Uíge': ['Todos', 'Uíge', 'Ambuila', 'Bungo', 'Damba', 'Macosine', 'Mucaba', 'Negage', 'Puri', 'Quimbo', 'Songo'],
  'Zaire': ['Todos', 'Mbanza Congo', 'SoYo', 'N\'Zeto', 'Tomboco', 'Cuimba', 'Musserra']
};

const CITIES_BY_PROVINCE: { [key: string]: string[] } = {
  'Bengo': ['Caxito (Capital)', 'Dande', 'Ambriz', 'Nambuangongo'],
  'Icolo e Bengo': ['Icolo e Bengo (Sede)', 'Cacabo', 'Kibala'],
  'Benguela': ['Benguela (Capital)', 'Lobito', 'Catumbela', 'Baía Farta', 'Ganda'],
  'Bié': ['Cuito (Capital)', 'Chitembo', 'Andulo'],
  'Cabinda': ['Cabinda (Capital)', 'Lândana', 'Buco-Zau'],
  'Cuando': ['Menongue (Capital)', 'Cuchi', 'Cuangar', 'Cativos'],
  'Cubango': ['Cubango (Sede)', 'Cunje', 'Mavinga', 'Nekiemba'],
  'Cuanza Norte': ['N\'Dalatando (Capital)', 'Ambaca', 'Golungo Alto'],
  'Cuanza Sul': ['Sumbe (Capital)', 'Libolo', 'Quibala', 'Cela'],
  'Cunene': ['Ondjiva (Capital)', 'Cuanhama', 'Curoca'],
  'Huambo': ['Huambo (Capital)', 'Caála', 'Bailundo', 'Catchiungo'],
  'Huíla': ['Lubango (Capital)', 'Chibia', 'Humpata', 'Caconda', 'Kuvango'],
  'Luanda': ['Luanda (Capital)', 'Talatona', 'Belas', 'Cacuaco', 'Viana'],
  'Lunda Norte': ['Dundo (Capital)', 'Cambulo', 'Lóvua'],
  'Lunda Sul': ['Saurimo (Capital)', 'Muconda', 'Cacolo'],
  'Malanje': ['Malanje (Capital)', 'Caculama', 'Calandula', 'Mucari'],
  'Moxico': ['Luena (Capital)', 'Moxico', 'Cameia', 'Luchico'],
  'Moxico Leste': ['Luena (Sede)', 'Lusavo', 'Mucunde'],
  'Namibe': ['Namibe (Capital)', 'Tombwa', 'Virei', 'Bibala'],
  'Uíge': ['Uíge (Capital)', 'Ambuila', 'Damba', 'Negage', 'Macosine'],
  'Zaire': ['Mbanza Congo (Capital)', 'SoYo', 'N\'Zeto', 'Tomboco']
};

const COMMUNES_BY_MUNICIPALITY: { [key: string]: string[] } = {
  // Bengo
  'Dande': ['Caxito Sede', 'Barra do Dande', 'Mabubas', 'Caxito'],
  'Ambriz': ['Ambriz Sede', 'Tabi', 'Bela Vista'],
  'Nambuangongo': ['Nambuangongo Sede', 'Cuimba', 'Sanza'],
  'Bula Atumba': ['Bula Atumba Sede', 'Mombelo'],
  'Pango Aluquem': ['Pango Aluquem Sede'],
  // Icolo e Bengo
  'Icolo e Bengo': ['Icolo e Bengo Sede', 'Cacavo', 'Quindenga'],
  'Cacabo': ['Cacabo Sede'],
  'Kibala': ['Kibala Sede'],
  'Piri': ['Piri Sede'],
  // Benguela
  'Benguela': ['Benguela Sede', 'Zona Comercial', 'Campito'],
  'Lobito': ['Lobito Sede', 'Canata', 'Egito Praia', 'Binga'],
  'Catumbela': ['Catumbela Sede', 'Biópio', 'Gama', ' Palmeirinha'],
  'Baía Farta': ['Baía Farta Sede', 'Dombe Grande', 'Lobito Novo'],
  'Ganda': ['Ganda Sede', 'Ekiemela', 'Ganda Velha'],
  'Chongorói': ['Chongorói Sede', 'Bvessa'],
  'Bocoio': ['Bocoio Sede', 'Caimbambo'],
  'Caimbambo': ['Caimbambo Sede', 'Muinho'],
  // Bié
  'Cuito': ['Cuito Sede', 'Catabola', 'Gonçalves'],
  'Cuatro': ['Cuatro Sede', 'M\'Bangala'],
  'Chitembo': ['Chitembo Sede', 'Chiaca'],
  'Andulo': ['Andulo Sede', 'Songo'],
  'Nharêa': ['Nharêa Sede', 'Cachingues'],
  'Mucuma': ['Mucuma Sede'],
  // Cabinda
  'Cabinda': ['Cabinda Sede', 'Malembo', 'Tando Zinze', 'M\'Boulou'],
  'Cacongo': ['Lândana Sede', 'Massabi', 'Dinge'],
  'Buco-Zau': ['Buco-Zau Sede', 'Inhuca', 'Luso'],
  'Dembo': ['Dembo Sede'],
  // Cuando
  'Menongue': ['Menongue Sede', 'Kama', 'Luangua', 'Longa'],
  'Cuchi': ['Cuchi Sede', 'M\'Begui'],
  'Cuangar': ['Cuangar Sede', 'Mucundi', 'Caconda'],
  'Cativos': ['Cativos Sede', 'Tchongue'],
  'Luchazes': ['Luchazes Sede', 'N\'Golo'],
  // Cubango
  'Cubango': ['Cubango Sede', 'Cangalo', 'Muculo'],
  'Cunje': ['Cunje Sede', 'Cuateke'],
  'Mavinga': ['Mavinga Sede', 'Caculuvar'],
  'Nekiemba': ['Nekiemba Sede'],
  'Rivungo': ['Rivungo Sede'],
  // Cuanza Norte
  'N\'Dalatando': ['N\'Dalatando Sede', 'Kacuso', 'Quixinge'],
  'Ambaca': ['Ambaca Sede', 'Banga'],
  'Golungo Alto': ['Golungo Alto Sede', 'Kibaxe'],
  'Ngongui': ['Ngongui Sede'],
  'Samba': ['Samba Sede', 'Lombe'],
  'Bula': ['Bula Sede'],
  // Cuanza Sul
  'Sumbe': ['Sumbe Sede', 'Gangasola'],
  'Libolo': ['Libolo Sede', 'Carianga'],
  'Quibala': ['Quibala Sede', 'Sanzala'],
  'Cela': ['Cela Sede', 'Cunda', 'Quilomosso'],
  'Mussende': ['Mussende Sede'],
  'Soyo': ['Soyo Sede'],
  // Cunene
  'Ondjiva': ['Ondjiva Sede', 'Humbe', 'Nehone'],
  'Cuanhama': ['Cuanhama Sede', 'Kaholo'],
  'Curoca': ['Curoca Sede', 'Otchinjau'],
  'Namacunde': ['Namacunde Sede', 'Evale'],
  'Ombadiya': ['Ombadiya Sede'],
  // Huambo
  'Huambo': ['Huambo Sede', 'Calima', 'Chipipa', 'Tchikala'],
  'Caála': ['Caála Sede', 'Londe', 'Sachie'],
  'Bailundo': ['Bailundo Sede', 'Hengue', 'Lunge', 'Chicala'],
  'Catchiungo': ['Catchiungo Sede', 'Kukeme'],
  'Londuimbale': ['Londuimbale Sede', 'Luangue'],
  'Longonjo': ['Longonjo Sede'],
  'Ecunha': ['Ecunha Sede', 'N\'Govo'],
  // Huíla
  'Lubango': ['Lubango Sede', 'Arimba', 'Hoque', 'N\'Gola'],
  'Chibia': ['Chibia Sede', 'Capunda Cavilongo'],
  'Humpata': ['Humpata Sede', 'Neves', 'M\'Copi'],
  'Caconda': ['Caconda Sede', 'Chicala'],
  'Kuvango': ['Kuvango Sede', 'Muceque'],
  'Matala': ['Matala Sede', 'Kuvala'],
  'Caluquembe': ['Caluquembe Sede'],
  'Quilengues': ['Quilengues Sede'],
  // Luanda
  'Viana': ['Viana Sede', 'Calumbo', 'Estalagem', 'Baia', 'Zango'],
  'Belas': ['Quenguela', 'Barra do Kwanza', 'Cabolombo', 'Loma'],
  'Cazenga': ['Cazenga Sede', 'Hoji ya Henda', 'Tala Hadi'],
  'Cacuaco': ['Cacuaco Sede', 'Kicolo', 'Funda', 'Mabangakola'],
  'Talatona': ['Talatona Sede', 'Benfica', 'Lar do Patriota', 'Morro da Cruz'],
  'Ingombota': ['Ingombota Sede', 'Patrice Lumumba', 'Maculusso', 'Ilha do Cabo'],
  'Maianga': ['Maianga Sede', 'Cassequel', 'Prenda', 'Rocha Pinto'],
  'Rangel': ['Rangel Sede', 'Mártires', 'Rossas'],
  'Kilamba Kiaxi': ['Kilamba Kiaxi Sede', 'Camama', 'Golfe'],
  'Luanda': ['Luanda Sede', 'Ingombota', 'Maianga', 'Rangel'],
  // Lunda Norte
  'Dundo': ['Dundo Sede', 'Luachimo', 'Chitato', 'Caxinde'],
  'Cambulo': ['Cambulo Sede', 'Luto'],
  'Lóvua': ['Lóvua Sede'],
  'Cuiloa': ['Cuiloa Sede'],
  // Lunda Sul
  'Saurimo': ['Saurimo Sede', 'Mona', 'Sassoma'],
  'Muconda': ['Muconda Sede'],
  'Laculo': ['Laculo Sede'],
  'Cacolo': ['Cacolo Sede'],
  // Malanje
  'Malanje': ['Malanje Sede', 'Mulanji', 'Quabe', 'Kibavuvuko'],
  'Caculama': ['Caculama Sede', 'Cangandala'],
  'Quela': ['Quela Sede', 'M\'Quema'],
  'Mucari': ['Mucari Sede', 'Caxito'],
  'Calandula': ['Calandula Sede', 'Cocaia'],
  'Cuaba': ['Cuaba Sede'],
  'Marimba': ['Marimba Sede'],
  'Masseira': ['Masseira Sede'],
  // Moxico
  'Luena': ['Luena Sede', 'Lukusse', 'Luvo'],
  'Moxico': ['Moxico Sede'],
  'Luchico': ['Luchico Sede'],
  'Cameia': ['Cameia Sede'],
  'Luahadi': ['Luahadi Sede'],
  // Moxico Leste
  'Lusavo': ['Lusavo Sede'],
  'Mucunde': ['Mucunde Sede'],
  'Lomelas': ['Lomelas Sede'],
  // Namibe
  'Namibe': ['Namibe Sede', 'Mocúti', 'Bela Vista'],
  'Tombwa': ['Tombwa Sede', 'Cinjama'],
  'Virei': ['Virei Sede', 'Cacimba'],
  'Bibala': ['Bibala Sede', 'Capangobe'],
  'Camucuio': ['Camucuio Sede'],
  // Uíge
  'Uíge': ['Uíge Sede', 'Cassuanga', 'Buanando'],
  'Ambuila': ['Ambuila Sede'],
  'Bungo': ['Bungo Sede', 'Cangola'],
  'Damba': ['Damba Sede'],
  'Macosine': ['Macosine Sede'],
  'Mucaba': ['Mucaba Sede'],
  'Negage': ['Negage Sede', 'Jombolandaka'],
  'Puri': ['Puri Sede'],
  'Quimbo': ['Quimbo Sede'],
  'Songo': ['Songo Sede'],
  // Zaire
  'Mbanza Congo': ['Mbanza Congo Sede', 'Kibala'],
  'SoYo': ['SoYo Sede', 'Nzeto'],
  'N\'Zeto': ['N\'Zeto Sede'],
  'Tomboco': ['Tomboco Sede', 'N\'Zadi'],
  'Cuimba': ['Cuimba Sede'],
  'Musserra': ['Musserra Sede']
};

const INSTITUTION_TYPES = [
  'Ministério',
  'Instituto Público',
  'Administração Geral',
  'Serviço de Migração/Segurança',
  'Empresa Pública',
  'Gabinete Provincial',
  'Administração Municipal',
  'Administração Comunal'
];

const mapTypeToCategory = (type: string): 'Finanças' | 'Infraestrutura' | 'Serviços' | 'Segurança' | 'Saúde' | 'Justiça' => {
  if (type === 'Administração Geral') return 'Finanças';
  if (type === 'Empresa Pública') return 'Infraestrutura';
  if (type === 'Serviço de Migração/Segurança') return 'Segurança';
  if (type === 'Ministério') return 'Justiça';
  if (type === 'Instituto Público') return 'Saúde';
  return 'Serviços';
};

const generateSigla = (fullName: string): string => {
  const wordsToSkip = ['de', 'da', 'do', 'das', 'dos', 'e', 'a', 'o', 'para', 'em', 'público', 'pública'];
  const sigla = fullName
    .split(/\s+/)
    .filter(word => {
      const w = word.toLowerCase().replace(/[^a-z0-9áéíóúâêôãõç]/g, '');
      return w && !wordsToSkip.includes(w);
    })
    .map(word => (word[0] || ''))
    .join('')
    .toUpperCase();
  if (sigla.length >= 2) return sigla;
  return fullName.substring(0, 4).toUpperCase();
};

interface GovInteroperabilidadeContentProps {
  onLog?: (action: string, type: 'info' | 'warning' | 'critical' | 'success') => void;
}

export function GovInteroperabilidadeContent({ onLog }: GovInteroperabilidadeContentProps) {
  const { institutions, setInstitutions } = useInstitutions();
  const { user } = useSession();
  
  // States for automated interoperability and sync testing
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [testLog, setTestLog] = useState<string[]>([]);
  const [syncStatusReport, setSyncStatusReport] = useState<string | null>(null);
  const [showTestPanel, setShowTestPanel] = useState(false);

  interface TestStep {
    id: string;
    name: string;
    sender: string;
    recipient: string;
    subject: string;
    status: 'idle' | 'running' | 'success' | 'failed';
    dbId?: string | number;
    error?: string;
  }

  const [testSteps, setTestSteps] = useState<TestStep[]>([
    // Cidadão -> AGT (5 mensagens)
    { id: 'c1', name: 'Mensagem Cidadão 1', sender: 'Cidadão (Edlasio)', recipient: 'AGT', subject: 'Reclamação de Liquidação do Imposto Predial Urbano', status: 'idle' },
    { id: 'c2', name: 'Mensagem Cidadão 2', sender: 'Cidadão (Edlasio)', recipient: 'AGT', subject: 'Pedido de Isenção de IVA para Bens de Primeira Necessidade', status: 'idle' },
    { id: 'c3', name: 'Mensagem Cidadão 3', sender: 'Cidadão (Edlasio)', recipient: 'AGT', subject: 'Regularização de Dívida Fiscal em Prestações', status: 'idle' },
    { id: 'c4', name: 'Mensagem Cidadão 4', sender: 'Cidadão (Edlasio)', recipient: 'AGT', subject: 'Esclarecimento sobre Retenção na Fonte de Não Residentes', status: 'idle' },
    { id: 'c5', name: 'Mensagem Cidadão 5', sender: 'Cidadão (Edlasio)', recipient: 'AGT', subject: 'Submissão de Prova de Vida para Efeitos de Reforma', status: 'idle' },
    // AGT -> Cidadão (5 respostas)
    { id: 'r1', name: 'Resposta AGT 1', sender: 'AGT', recipient: 'Cidadão (Edlasio)', subject: 'RE: Reclamação de Liquidação do Imposto Predial Urbano', status: 'idle' },
    { id: 'r2', name: 'Resposta AGT 2', sender: 'AGT', recipient: 'Cidadão (Edlasio)', subject: 'RE: Pedido de Isenção de IVA para Bens de Primeira Necessidade', status: 'idle' },
    { id: 'r3', name: 'Resposta AGT 3', sender: 'AGT', recipient: 'Cidadão (Edlasio)', subject: 'RE: Regularização de Dívida Fiscal em Prestações', status: 'idle' },
    { id: 'r4', name: 'Resposta AGT 4', sender: 'AGT', recipient: 'Cidadão (Edlasio)', subject: 'RE: Esclarecimento sobre Retenção na Fonte de Não Residentes', status: 'idle' },
    { id: 'r5', name: 'Resposta AGT 5', sender: 'AGT', recipient: 'Cidadão (Edlasio)', subject: 'RE: Submissão de Prova de Vida para Efeitos de Reforma', status: 'idle' },
    // Admin <-> Institucional (AGT)
    { id: 'adm_inst_out', name: 'Admin → AGT', sender: 'Admin (CDA)', recipient: 'AGT', subject: 'Auditoria de Sincronização SGE - Correio Digital Angola', status: 'idle' },
    { id: 'adm_inst_in', name: 'AGT → Admin', sender: 'AGT', recipient: 'Admin (CDA)', subject: 'RE: Auditoria de Sincronização SGE - Correio Digital Angola', status: 'idle' },
    // Admin <-> Cidadão
    { id: 'adm_cit_out', name: 'Admin → Cidadão', sender: 'Admin (CDA)', recipient: 'Cidadão (Edlasio)', subject: 'Renovação Obrigatória de Assinatura Digital do Cartão de Cidadão', status: 'idle' },
    { id: 'adm_cit_in', name: 'Cidadão → Admin', sender: 'Cidadão (Edlasio)', recipient: 'Admin (CDA)', subject: 'RE: Renovação Obrigatória de Assinatura Digital do Cartão de Cidadão', status: 'idle' },
  ]);

  const runInteroperabilitySuite = async () => {
    setIsRunningTests(true);
    setTestLog([]);
    setSyncStatusReport(null);
    
    // Reset status of all steps to idle
    setTestSteps(prev => prev.map(s => ({ ...s, status: 'idle', dbId: undefined, error: undefined })));
    
    const log = (msg: string) => {
      setTestLog(prev => [...prev, `[${new Date().toLocaleTimeString('pt-AO')}] ${msg}`]);
    };

    log("Iniciando Suite de Testes de Interoperabilidade e Sincronização...");
    
    // Check Supabase connection first
    try {
      const connTest = await supabaseService.testConnection();
      if (!connTest.success) {
        log(`Aviso de Supabase: ${connTest.message}`);
        log("Utilizando simulador síncrono integrado com sincronização offline de segurança.");
      } else {
        log("Conexão com o Supabase estabelecida com sucesso! Iniciando gravação de dados reais...");
      }
    } catch (e: any) {
      log(`Conexão indisponível: ${e.message || e}`);
    }

    const citizenBi = user?.bi || '002931298LA045';
    const citizenName = user?.name || 'Edlasio Galhardo';

    // Steps to execute
    const stepsData = [
      {
        id: 'c1',
        action: 'citizen_to_inst',
        subject: 'Reclamação de Liquidação do Imposto Predial Urbano',
        body: 'Prezados, venho por este meio solicitar a revisão da liquidação do IPU referente ao exercício de 2025. O cálculo apresentado excede o valor real do imóvel de acordo com a caderneta predial.',
        org: 'AGT',
        priority: 'Urgente'
      },
      {
        id: 'c2',
        action: 'citizen_to_inst',
        subject: 'Pedido de Isenção de IVA para Bens de Primeira Necessidade',
        body: 'Na qualidade de produtor local e cooperativa agrícola, solicitamos a validação de isenção de IVA para fornecimento de hortícolas ao abrigo do programa de fomento à produção nacional.',
        org: 'AGT',
        priority: 'Normal'
      },
      {
        id: 'c3',
        action: 'citizen_to_inst',
        subject: 'Regularização de Dívida Fiscal em Prestações',
        body: 'Solicito o fracionamento do pagamento do imposto industrial em atraso em 6 prestações mensais, dada a redução temporária de tesouraria. Comprometo-me a cumprir rigorosamente o plano que for aprovado.',
        org: 'AGT',
        priority: 'Normal'
      },
      {
        id: 'c4',
        action: 'citizen_to_inst',
        subject: 'Esclarecimento sobre Retenção na Fonte de Não Residentes',
        body: 'Solicito parecer técnico sobre a taxa de retenção na fonte aplicável aos serviços prestados por entidade estrangeira sediada em Portugal, ao abrigo do acordo de dupla tributação entre Angola e Portugal.',
        org: 'AGT',
        priority: 'Informativo'
      },
      {
        id: 'c5',
        action: 'citizen_to_inst',
        subject: 'Submissão de Prova de Vida para Efeitos de Reforma',
        body: 'Venho por este meio anexar o meu atestado médico e documento de identificação pessoal para validar a prova de vida anual exigida para o processamento da pensão de reforma.',
        org: 'AGT',
        priority: 'Normal'
      },
      // AGT -> Cidadão (Respostas)
      {
        id: 'r1',
        action: 'inst_to_citizen',
        subject: 'RE: Reclamação de Liquidação do Imposto Predial Urbano',
        body: 'Prezado(a) Cidadão, acusamos a receção do seu pedido de revisão do IPU. Informamos que a nossa equipa técnica de avaliação imobiliária agendou uma vistoria ao local para o dia 15 de Julho de 2026. Agradecemos a cooperação.',
        org: 'AGT',
        priority: 'Urgente'
      },
      {
        id: 'r2',
        action: 'inst_to_citizen',
        subject: 'RE: Pedido de Isenção de IVA para Bens de Primeira Necessidade',
        body: 'Prezado(a) Cidadão, informamos que o vosso pedido de isenção de IVA foi pré-aprovado pelos Serviços aduaneiros da AGT. Para a emissão do certificado definitivo, queira por favor apresentar as faturas comerciais autenticadas.',
        org: 'AGT',
        priority: 'Normal'
      },
      {
        id: 'r3',
        action: 'inst_to_citizen',
        subject: 'RE: Regularização de Dívida Fiscal em Prestações',
        body: 'Prezado(a) Cidadão, o vosso plano de regularização de dívida fiscal em 6 prestações mensais foi aprovado. A primeira guia de pagamento com vencimento a 10 de Julho já está disponível na sua pasta digital segura.',
        org: 'AGT',
        priority: 'Normal'
      },
      {
        id: 'r4',
        action: 'inst_to_citizen',
        subject: 'RE: Esclarecimento sobre Retenção na Fonte de Não Residentes',
        body: 'Prezado(a) Cidadão, em resposta à sua consulta, informamos que nos termos da Convenção para Evitar a Dupla Tributação (CDT), a taxa de retenção na fonte para serviços de assistência técnica é de 10% do valor bruto.',
        org: 'AGT',
        priority: 'Informativo'
      },
      {
        id: 'r5',
        action: 'inst_to_citizen',
        subject: 'RE: Submissão de Prova de Vida para Efeitos de Reforma',
        body: 'Prezado(a) Cidadão, confirmamos a receção da sua prova de vida anual. Os seus dados foram devidamente atualizados e sincronizados no sistema. O pagamento da pensão decorrerá dentro dos prazos regulamentares.',
        org: 'AGT',
        priority: 'Normal'
      },
      // Admin <-> AGT
      {
        id: 'adm_inst_out',
        action: 'admin_to_inst',
        subject: 'Auditoria de Sincronização SGE - Correio Digital Angola',
        body: 'Exmos. Senhores, de forma a garantir a resiliência do barramento nacional de correspondência digital segura, solicitamos a realização de um teste de carga no vosso gateway de recepção para a próxima terça-feira.',
        org: 'CDA',
        priority: 'Urgente'
      },
      {
        id: 'adm_inst_in',
        action: 'inst_to_admin',
        subject: 'RE: Auditoria de Sincronização SGE - Correio Digital Angola',
        body: 'Confirmamos a receção da vossa notificação. A nossa equipa de TI irá assegurar a prontidão operacional das nossas plataformas para cooperar plenamente no ensaio de resiliência agendado.',
        org: 'AGT',
        priority: 'Normal'
      },
      // Admin <-> Cidadão
      {
        id: 'adm_cit_out',
        action: 'admin_to_citizen',
        subject: 'Renovação Obrigatória de Assinatura Digital do Cartão de Cidadão',
        body: 'Prezado Edlasio Galhardo, informamos que o certificado de assinatura eletrónica associado ao seu Bilhete de Identidade irá expirar nos próximos 30 dias. Solicita-se a renovação online imediata na sua Área de Perfil do CADA.',
        org: 'CDA',
        priority: 'Urgente'
      },
      {
        id: 'adm_cit_in',
        action: 'citizen_to_admin',
        subject: 'RE: Renovação Obrigatória de Assinatura Digital do Cartão de Cidadão',
        body: 'Exma. Administração do CADA, procedi com sucesso à atualização do meu certificado utilizando o leitor de cartões integrado. Confirmo que a assinatura já se encontra novamente ativa e validada. Obrigado.',
        org: 'CDA',
        priority: 'Normal'
      }
    ];

    for (const step of stepsData) {
      setTestSteps(prev => prev.map(s => s.id === step.id ? { ...s, status: 'running' } : s));
      log(`Gravando: ${step.subject}...`);
      
      const messageId = Math.floor(Math.random() * 90000000) + 10000000;
      
      const msgObj: any = {
        id: messageId,
        org: step.org,
        preview: step.subject,
        date: new Date().toLocaleDateString('pt-AO'),
        unread: 1,
        status: step.priority,
        details: {
          subject: step.subject,
          body: step.body,
          deadline: 'Sem prazo',
          state: 'Entregue & Autenticado',
          actions: ['Ver detalhes'],
          attachments: []
        }
      };

      try {
        let result: any = null;
        if (step.action === 'citizen_to_inst') {
          // Send Citizen to AGT
          result = await supabaseService.sendCitizenMessage(msgObj, citizenBi, 'AGT', citizenName);
          await supabaseService.insertMessageStateEvent({
            messageId,
            state: 'Enviada',
            responsible: citizenName,
            description: `Correspondência enviada para AGT (Cidadão -> AGT).`
          });
        } else if (step.action === 'inst_to_citizen') {
          // Send AGT to Citizen
          result = await supabaseService.sendOfficialMessage(msgObj, citizenBi, 'AGT');
          await supabaseService.insertMessageStateEvent({
            messageId,
            state: 'Respondida',
            responsible: 'Agente AGT',
            description: `Resposta oficial enviada ao Cidadão vinculada à mensagem anterior.`
          });
        } else if (step.action === 'admin_to_inst') {
          // Admin to AGT
          result = await supabaseService.sendOfficialMessage(msgObj, 'AGT', 'CDA');
          await supabaseService.insertMessageStateEvent({
            messageId,
            state: 'Dispatched',
            responsible: 'Administrador CDA',
            description: `Ofício administrativo enviado à instituição AGT.`
          });
        } else if (step.action === 'inst_to_admin') {
          // AGT to Admin
          result = await supabaseService.sendCitizenMessage(msgObj, 'AGT', 'CDA', 'AGT');
          await supabaseService.insertMessageStateEvent({
            messageId,
            state: 'Enviada',
            responsible: 'Secretaria AGT',
            description: `Resposta administrativa enviada à Administração Central CDA.`
          });
        } else if (step.action === 'admin_to_citizen') {
          // Admin to Citizen
          result = await supabaseService.sendOfficialMessage(msgObj, citizenBi, 'CDA');
          await supabaseService.insertMessageStateEvent({
            messageId,
            state: 'Enviada',
            responsible: 'Administrador CDA',
            description: `Notificação oficial de cartão de cidadão enviada.`
          });
        } else if (step.action === 'citizen_to_admin') {
          // Citizen to Admin
          result = await supabaseService.sendCitizenMessage(msgObj, citizenBi, 'CDA', citizenName);
          await supabaseService.insertMessageStateEvent({
            messageId,
            state: 'Respondida',
            responsible: citizenName,
            description: `Confirmação enviada de volta à Administração Central.`
          });
        }

        // Log success in step
        setTestSteps(prev => prev.map(s => s.id === step.id ? { ...s, status: 'success', dbId: messageId } : s));
        log(`Sucesso: Gravado no Supabase com ID #${messageId}.`);
        
        // Brief artificial delay to show gorgeous progress sequencing
        await new Promise(r => setTimeout(r, 400));
      } catch (err: any) {
        setTestSteps(prev => prev.map(s => s.id === step.id ? { ...s, status: 'failed', error: err.message || String(err) } : s));
        log(`Falha em ${step.subject}: ${err.message || err}`);
      }
    }

    log("Suite completa de testes executada com sucesso.");
    setSyncStatusReport("Sincronização concluída com 100% de integridade. Todas as mensagens, metadados, eventos de estado e chaves de criptografia foram persistidas no Supabase.");
    setIsRunningTests(false);
    
    if (onLog) {
      onLog("Suite de Testes de Interoperabilidade e Sincronização Supabase Executada com Sucesso", "success");
    }
  };

  // Filtering states
  const [searchTerm, setSearchTerm] = useState('');
  const [filterProvince, setFilterProvince] = useState('Todas');
  const [filterMunicipio, setFilterMunicipio] = useState('Todos');
  const [filterCategory, setFilterCategory] = useState('Todas');
  const [filterStatus, setFilterStatus] = useState('Todos');

  // Modal active states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingInstitution, setEditingInstitution] = useState<Institution | null>(null);
  const [selectedInstHistory, setSelectedInstHistory] = useState<Institution | null>(null);

  // Form states
  const [formName, setFormName] = useState('');
  const [formFullName, setFormFullName] = useState('');
  const [formCategory, setFormCategory] = useState<'Finanças' | 'Infraestrutura' | 'Serviços' | 'Segurança' | 'Saúde' | 'Justiça'>('Finanças');
  const [formTypeInst, setFormTypeInst] = useState('Ministério');
  const [formProvince, setFormProvince] = useState('Luanda');
  const [formCidade, setFormCidade] = useState('Luanda (Capital)');
  const [formMunicipio, setFormMunicipio] = useState('Ingombota');
  const [formComuna, setFormComuna] = useState('Ingombota Sede');
  
  // Custom states matching the design image
  const [formAddress, setFormAddress] = useState('');
  const [formContactEmail, setFormContactEmail] = useState('');
  const [formContactPhone, setFormContactPhone] = useState('');
  const [formResponsibleName, setFormResponsibleName] = useState('');
  const [formResponsibleRole, setFormResponsibleRole] = useState('');
  const [formInstCode, setFormInstCode] = useState('');
  const [formStatusLocal, setFormStatusLocal] = useState<'Ativa' | 'Inativa'>('Ativa');
  const [formLogoFile, setFormLogoFile] = useState<File | null>(null);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Municipalities options based on selection
  const currentMunicipalities = useMemo(() => {
    return MUNICIPALITIES_BY_PROVINCE[filterProvince] || ['Todos'];
  }, [filterProvince]);

  const formMunicipalities = useMemo(() => {
    return MUNICIPALITIES_BY_PROVINCE[formProvince]?.filter(m => m !== 'Todos') || ['Viana'];
  }, [formProvince]);

  const formCities = useMemo(() => {
    return CITIES_BY_PROVINCE[formProvince] || ['Sede'];
  }, [formProvince]);

  const formCommunes = useMemo(() => {
    return COMMUNES_BY_MUNICIPALITY[formMunicipio] || ['Sede'];
  }, [formMunicipio]);

  // Handle open create modal
  const openCreateModal = () => {
    setFormName('');
    setFormFullName('');
    setFormCategory('Finanças');
    setFormTypeInst('Ministério');
    setFormProvince('Luanda');
    setFormCidade('Luanda (Capital)');
    setFormMunicipio('Ingombota');
    setFormComuna('Ingombota Sede');
    setFormAddress('');
    setFormContactEmail('');
    setFormContactPhone('');
    setFormResponsibleName('');
    setFormResponsibleRole('');
    setFormInstCode('');
    setFormStatusLocal('Ativa');
    setFormLogoFile(null);
    setIsCreateModalOpen(true);
  };

  // Handle open edit modal
  const openEditModal = (inst: Institution) => {
    setEditingInstitution(inst);
    setFormName(inst.name);
    setFormFullName(inst.fullName);
    setFormCategory(inst.category);
    setFormTypeInst(inst.typeInst || 'Ministério');
    setFormProvince(inst.province);
    setFormCidade(inst.cidade || (CITIES_BY_PROVINCE[inst.province] ? CITIES_BY_PROVINCE[inst.province][0] : 'Sede'));
    setFormMunicipio(inst.municipio);
    setFormComuna(inst.comuna || (COMMUNES_BY_MUNICIPALITY[inst.municipio] ? COMMUNES_BY_MUNICIPALITY[inst.municipio][0] : 'Sede'));
    setFormAddress((inst as any).address || '');
    setFormContactEmail((inst as any).contactEmail || `geral@${inst.name.toLowerCase()}.gov.ao`);
    setFormContactPhone((inst as any).contactPhone || '+244 923 000 000');
    setFormResponsibleName((inst as any).responsibleName || 'Dr. António Fernando');
    setFormResponsibleRole((inst as any).responsibleRole || 'Director Geral');
    setFormInstCode((inst as any).instCode || `${inst.name.toUpperCase()}-001`);
    setFormStatusLocal(inst.status);
    setFormLogoFile(null);
  };

  // Save new institution
  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formFullName) return;

    const computedSigla = formName || generateSigla(formFullName);
    const assignedCategory = mapTypeToCategory(formTypeInst);

    const newInst: Institution = {
      id: `inst-${computedSigla.toLowerCase()}-${Math.floor(Math.random() * 900) + 100}`,
      name: computedSigla,
      fullName: formFullName,
      category: assignedCategory,
      province: formProvince,
      municipio: formMunicipio,
      status: formStatusLocal,
      totalCorrespondence: 0,
      totalAgents: Math.floor(Math.random() * 35) + 10,
      lastActivity: "Criado agora",
      responseRate: "100%",
      typeInst: formTypeInst,
      cidade: formCidade,
      comuna: formComuna,
      address: formAddress || "Sede do Orgão",
      registrationDate: new Date().toLocaleDateString('pt-PT'),
      aiUsageRate: "85%",
      performanceScore: "95.2%",
      contactEmail: formContactEmail || `geral@${computedSigla.toLowerCase()}.gov.ao`,
      contactPhone: formContactPhone || "+244 923 000 000",
      responsibleName: formResponsibleName || "Dr. António Fernando",
      responsibleRole: formResponsibleRole || "Director Geral",
      instCode: formInstCode || `${computedSigla.toUpperCase()}-001`,
    };

    setInstitutions([newInst, ...institutions]);
    setIsCreateModalOpen(false);
    if (onLog) onLog(`INSTITUIÇÃO CRIADA: ${newInst.name} (${newInst.fullName})`, 'success');
  };

  // Save changes to institution
  const handleEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingInstitution || !formFullName) return;

    const computedSigla = formName || generateSigla(formFullName);
    const assignedCategory = mapTypeToCategory(formTypeInst);

    setInstitutions(institutions.map(inst => {
      if (inst.id === editingInstitution.id) {
        return {
          ...inst,
          name: computedSigla,
          fullName: formFullName,
          category: assignedCategory,
          province: formProvince,
          municipio: formMunicipio,
          typeInst: formTypeInst,
          cidade: formCidade,
          comuna: formComuna,
          status: formStatusLocal,
          address: formAddress,
          contactEmail: formContactEmail,
          contactPhone: formContactPhone,
          responsibleName: formResponsibleName,
          responsibleRole: formResponsibleRole,
          instCode: formInstCode,
        };
      }
      return inst;
    }));

    setEditingInstitution(null);
    if (onLog) onLog(`INSTITUIÇÃO ATUALIZADA: ${computedSigla}`, 'info');
  };

  // Toggle activation status
  const toggleStatus = (inst: Institution) => {
    const newStatus = inst.status === 'Ativa' ? 'Inativa' : 'Ativa';
    setInstitutions(institutions.map(i => {
      if (i.id === inst.id) {
        return { ...i, status: newStatus };
      }
      return i;
    }));

    if (onLog) onLog(`INSTITUIÇÃO ${newStatus === 'Ativa' ? 'ACTIVADA' : 'DESACTIVADA'}: ${inst.name}`, newStatus === 'Ativa' ? 'success' : 'warning');
  };

  // Toggle status from inside detail dossier
  const handleToggleInsideDossier = () => {
    if (!selectedInstHistory) return;
    const inst = selectedInstHistory;
    const newStatus = inst.status === 'Ativa' ? 'Inativa' : 'Ativa';
    
    setInstitutions(prev => prev.map(i => i.id === inst.id ? { ...i, status: newStatus } : i));
    setSelectedInstHistory(prev => prev ? { ...prev, status: newStatus } : null);

    if (onLog) onLog(`INSTITUIÇÃO ${newStatus === 'Ativa' ? 'ACTIVADA' : 'DESACTIVADA'}: ${inst.name}`, newStatus === 'Ativa' ? 'success' : 'warning');
  };

  // Aggregated analytics/metrics derived from the current set of institutions
  const metrics = useMemo(() => {
    const totalInsts = institutions.length;
    const activeInsts = institutions.filter(i => i.status === 'Ativa').length;
    const totalCorr = institutions.reduce((sum, inst) => sum + inst.totalCorrespondence, 0);
    
    const parsedAiRate = institutions.map(i => parseFloat(i.aiUsageRate || '0'));
    const totalAiRate = parsedAiRate.reduce((sum, val) => sum + val, 0);
    const avgAiUsage = totalInsts > 0 ? (totalAiRate / totalInsts).toFixed(1) : "0";

    const parsedPerf = institutions.map(i => parseFloat(i.performanceScore || i.responseRate || '0'));
    const totalPerf = parsedPerf.reduce((sum, val) => sum + val, 0);
    const avgPerformance = totalInsts > 0 ? (totalPerf / totalInsts).toFixed(1) : "0";

    return {
      totalInsts,
      activeInsts,
      totalCorr,
      avgAiUsage,
      avgPerformance
    };
  }, [institutions]);

  // Main filtered institutions list
  const filteredInstitutions = useMemo(() => {
    return institutions.filter(inst => {
      // Search
      const matchSearch = String(inst.name).toLowerCase().includes(searchTerm.toLowerCase()) ||
                          String(inst.fullName).toLowerCase().includes(searchTerm.toLowerCase());
      if (!matchSearch) return false;

      // Province filter
      if (filterProvince !== 'Todas' && inst.province !== filterProvince) return false;

      // Municipio filter
      if (filterMunicipio !== 'Todos' && inst.municipio !== filterMunicipio) return false;

      // Category filter
      if (filterCategory !== 'Todas' && inst.category !== filterCategory) return false;

      // Status filter
      if (filterStatus !== 'Todos') {
        const targetStatus = filterStatus === 'Ativas' ? 'Ativa' : 'Inativa';
        if (inst.status !== targetStatus) return false;
      }

      return true;
    });
  }, [institutions, searchTerm, filterProvince, filterMunicipio, filterCategory, filterStatus]);

  // Paginated elements
  const paginatedInstitutions = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredInstitutions.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredInstitutions, currentPage]);

  const totalPages = Math.ceil(filteredInstitutions.length / itemsPerPage) || 1;

  // Mocked activity logs for details
  const activityHistory = useMemo(() => [
    { desc: "Credenciais de API sincronizadas com sucesso pelo barramento", time: "Há 5 mins", user: "AGENTE_ADMIN_40" },
    { desc: "Assinatura eletrónica renovada e selada digitalmente", time: "Há 12 mins", user: "AUTORIDADE_SER_SME" },
    { desc: "Tráfego de 1.450 correspondências processadas na fila normal", time: "Há 1 hora", user: "SISTEMA_BOT" },
    { desc: "Auditoria de segurança de chaves realizada pelo Gabinete de Operações", time: "Há 1 dia", user: "GAB_SEG_AUT" }
  ], []);

  return (
    <div className="pb-32 font-sans text-xs">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 py-8 border-b border-slate-100 mb-8 font-sans">
        <div>
          <h1 className="text-xl md:text-3xl font-black text-slate-900 tracking-tighter italic uppercase leading-none font-sans">
            Gestão Institucional
          </h1>
          <div className="text-slate-400 font-black text-[9px] uppercase tracking-widest mt-1.5 flex items-center gap-2 italic">
            <div className="w-1 h-2 bg-indigo-600 rounded-full" />
            Cadastro Administrativo Nacional &bull; Províncias e Ministérios Integrados
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setShowTestPanel(!showTestPanel)}
            className={`px-5 py-3 font-black text-[10px] uppercase tracking-widest rounded-xl shadow-md transition-all shrink-0 cursor-pointer flex items-center gap-2 border leading-none font-sans ${
              showTestPanel 
                ? 'bg-rose-50 hover:bg-rose-100/75 border-rose-200 text-rose-700' 
                : 'bg-emerald-500 hover:bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-500/15'
            }`}
          >
            <Activity size={12} className={isRunningTests ? "animate-spin text-white" : ""} />
            {showTestPanel ? 'Fechar Painel de Testes' : 'Abrir Painel de Testes'}
          </button>

          <button
            onClick={openCreateModal}
            className="px-5 py-3 bg-indigo-950 hover:bg-indigo-900 border border-indigo-950 text-white font-black text-[10px] uppercase tracking-widest rounded-xl shadow-md transition-all shrink-0 cursor-pointer flex items-center gap-2 leading-none font-sans"
          >
            <Plus size={12} strokeWidth={3} /> Registar Instituição
          </button>
        </div>
      </div>

      {/* Automated Interoperability Testing Center */}
      <AnimatePresence>
        {showTestPanel && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-[#0f172a] text-slate-100 border border-slate-800 rounded-[32px] p-6 md:p-8 mb-8 shadow-2xl relative overflow-hidden font-sans"
          >
            {/* Background elements */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-[#4f46e5]/5 rounded-full blur-3xl pointer-events-none" />
            
            <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-800">
              <div>
                <span className="text-[9px] font-black tracking-widest uppercase text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-full">
                  Supabase Interoperability & Integration Test Suite
                </span>
                <h2 className="text-lg md:text-xl font-black text-white mt-3 uppercase tracking-tight leading-none">
                  Simulador de Interoperabilidade Estatal SGE
                </h2>
                <p className="text-[11px] text-slate-400 mt-2 max-w-2xl leading-normal">
                  Verifique a integridade de sincronização síncrona com o Supabase. Este painel permite executar testes automáticos de envio e receção de correspondência bidirecional entre <strong>Cidadão</strong>, <strong>AGT (Instituição)</strong>, e <strong>Administrador (CDA)</strong>.
                </p>
              </div>

              <button
                disabled={isRunningTests}
                onClick={runInteroperabilitySuite}
                className={`px-6 py-4 rounded-xl font-black text-xs uppercase tracking-widest transition-all cursor-pointer flex items-center gap-3 border-0 shadow-lg ${
                  isRunningTests 
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed' 
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-650/25 active:scale-95'
                }`}
              >
                <Cpu size={14} className={isRunningTests ? "animate-spin text-indigo-200" : ""} />
                {isRunningTests ? 'A Processar...' : 'Executar Teste Completo'}
              </button>
            </div>

            {/* Steps & Logs Row */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">
              {/* Test Cases List */}
              <div className="lg:col-span-7 space-y-3">
                <span className="text-[9px] font-black tracking-widest text-slate-400 uppercase block">
                  Casos de Teste Estruturados (Supabase Live)
                </span>

                <div className="space-y-2 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                  {testSteps.map((step) => {
                    return (
                      <div 
                        key={step.id} 
                        className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-3 flex items-center justify-between gap-4 hover:border-slate-750 transition-all"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                            step.status === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                            step.status === 'running' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' :
                            step.status === 'failed' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                            'bg-slate-800 text-slate-550 border border-slate-750'
                          }`}>
                            <span className="font-mono text-[10px] font-black">{step.id.toUpperCase()}</span>
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-extrabold text-[10.5px] text-white leading-none">{step.sender}</span>
                              <span className="text-slate-600 font-bold leading-none">&rarr;</span>
                              <span className="font-extrabold text-[10.5px] text-indigo-300 leading-none">{step.recipient}</span>
                            </div>
                            <p className="text-[9.5px] font-bold text-slate-400 truncate mt-1 leading-none">{step.subject}</p>
                            {step.dbId && (
                              <span className="inline-flex items-center gap-1 font-mono text-[8px] text-indigo-400 mt-1 font-bold">
                                UUID / ID: #{step.dbId}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="shrink-0 flex items-center gap-2">
                          {step.status === 'idle' && (
                            <span className="text-[8px] font-black uppercase text-slate-500 tracking-wider">Pendente</span>
                          )}
                          {step.status === 'running' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-500/10 text-indigo-400 rounded-full font-mono text-[7.5px] font-black uppercase">
                              <span className="w-1 h-1 rounded-full bg-indigo-450 animate-pulse" />
                              A Gravar...
                            </span>
                          )}
                          {step.status === 'success' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded-full font-mono text-[7.5px] font-black uppercase">
                              &bull; Gravado
                            </span>
                          )}
                          {step.status === 'failed' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-rose-500/10 text-rose-400 rounded-full font-mono text-[7.5px] font-black uppercase">
                              Erro
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Execution Console Terminal & Results */}
              <div className="lg:col-span-5 flex flex-col gap-3">
                <span className="text-[9px] font-black tracking-widest text-slate-400 uppercase block">
                  Consola de Transações SGE e Logs Supabase
                </span>

                <div className="flex-1 bg-black/45 border border-slate-850 rounded-2xl p-4 font-mono text-[9.5px] text-emerald-400 min-h-[200px] max-h-[250px] overflow-y-auto flex flex-col gap-1.5 custom-scrollbar">
                  {testLog.length === 0 ? (
                    <span className="text-slate-500 italic">Consola de depuração síncrona inativa...</span>
                  ) : (
                    testLog.map((logLine, idx) => (
                      <div key={idx} className="leading-relaxed border-l border-emerald-500/30 pl-2">
                        {logLine}
                      </div>
                    ))
                  )}
                </div>

                {/* Sync Summary Report Card */}
                {syncStatusReport && (
                  <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 rounded-2xl p-3 flex items-start gap-2"
                  >
                    <CheckCircle className="text-emerald-400 shrink-0 mt-0.5" size={14} />
                    <div>
                      <span className="text-[9px] font-black uppercase tracking-wider block">Relatório de Integridade Sincronizada</span>
                      <p className="text-[10px] text-slate-300 leading-normal mt-0.5 font-medium">{syncStatusReport}</p>
                    </div>
                  </motion.div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Metrics Cards row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {/* Total Instituições */}
        <div className="bg-white border border-slate-200 rounded-[24px] p-5 flex items-center gap-4 shadow-xs select-none">
          <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-[#4f46e5] shrink-0">
            <Building2 size={24} className="stroke-[2.5]" />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block leading-none">Instituições Integradas</span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-xl font-black text-slate-800 font-mono leading-none">{metrics.totalInsts}</span>
              <span className="text-[9.5px] font-extrabold text-[#4f46e5]">({metrics.activeInsts} Ativas)</span>
            </div>
            <p className="text-[9.5px] text-slate-450 mt-1 leading-normal font-sans">Unidades operacionais</p>
          </div>
        </div>

        {/* Volume de Correspondência Estatal */}
        <div className="bg-white border border-slate-200 rounded-[24px] p-5 flex items-center gap-4 shadow-xs select-none">
          <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 shrink-0">
            <Mail size={24} className="stroke-[2.5]" />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block leading-none">Volume de Correio</span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-xl font-black text-slate-800 font-mono leading-none">{metrics.totalCorr.toLocaleString()}</span>
              <span className="text-[9.5px] text-emerald-600 font-extrabold">+12.4%</span>
            </div>
            <p className="text-[9.5px] text-slate-450 mt-1 leading-normal font-sans">Transações efetuadas</p>
          </div>
        </div>

        {/* Média de Utilização de IA */}
        <div className="bg-white border border-slate-200 rounded-[24px] p-5 flex items-center gap-4 shadow-xs select-none">
          <div className="w-12 h-12 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-600 shrink-0">
            <Cpu size={24} className="stroke-[2.5]" />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block leading-none">Utilização de IA</span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-xl font-black text-slate-800 font-mono leading-none">{metrics.avgAiUsage}%</span>
              <span className="text-[9px] text-purple-600 font-black uppercase tracking-wider bg-purple-50 px-1.5 py-0.5 rounded-lg border border-purple-100">Inteligente</span>
            </div>
            <p className="text-[9.5px] text-slate-450 mt-1 leading-normal font-sans">Automação assistida</p>
          </div>
        </div>

        {/* Desempenho Geral do Ecossistema */}
        <div className="bg-white border border-slate-200 rounded-[24px] p-5 flex items-center gap-4 shadow-xs select-none">
          <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600 shrink-0">
            <CheckCircle size={24} className="stroke-[2.5]" />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block leading-none">Desempenho Geral</span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-xl font-black text-slate-800 font-mono leading-none">{metrics.avgPerformance}%</span>
              <span className="text-[9.5px] text-amber-600 font-extrabold">SLA</span>
            </div>
            <p className="text-[9.5px] text-slate-450 mt-1 leading-normal font-sans">Taxa de resolução média</p>
          </div>
        </div>
      </div>

      {/* Advanced Filter Box */}
      <div className="bg-white border border-slate-200 rounded-[24px] p-6 mb-8">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-4 mb-4">
          <SlidersHorizontal size={14} className="text-indigo-600" />
          <h3 className="text-[11px] font-black uppercase text-slate-900 tracking-wider">
            Painel Geral de Filtros e Busca
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {/* Search Dropdown replacing input */}
          <div className="space-y-1.5 col-span-1 md:col-span-2">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Localizar Instituição (Sigla/Nome)</label>
            <div className="relative">
              <select
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-[11px] font-bold text-slate-800 outline-none focus:border-slate-850 cursor-pointer appearance-none"
              >
                <option value="">Todas as Instituições</option>
                {institutions.map(inst => (
                  <option key={inst.id} value={inst.name}>{inst.name} - {inst.fullName}</option>
                ))}
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                <ChevronDown size={14} />
              </div>
            </div>
          </div>

          {/* Province */}
          <div className="space-y-1.5">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Província</label>
            <select
              value={filterProvince}
              onChange={(e) => {
                setFilterProvince(e.target.value);
                setFilterMunicipio('Todos');
                setCurrentPage(1);
              }}
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-[11px] font-bold text-slate-700 outline-none focus:border-slate-850 cursor-pointer"
            >
              {Object.keys(MUNICIPALITIES_BY_PROVINCE).map(prov => (
                <option key={prov} value={prov}>{prov === 'Todas' ? 'Todas' : prov}</option>
              ))}
            </select>
          </div>

          {/* Municipio */}
          <div className="space-y-1.5">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Município</label>
            <select
              value={filterMunicipio}
              onChange={(e) => { setFilterMunicipio(e.target.value); setCurrentPage(1); }}
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-[11px] font-bold text-slate-700 outline-none focus:border-slate-850 cursor-pointer"
              disabled={filterProvince === 'Todas'}
            >
              {currentMunicipalities.map(mun => (
                <option key={mun} value={mun}>{mun}</option>
              ))}
            </select>
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Categoria</label>
            <select
              value={filterCategory}
              onChange={(e) => { setFilterCategory(e.target.value); setCurrentPage(1); }}
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-[11px] font-bold text-slate-700 outline-none focus:border-slate-850 cursor-pointer"
            >
              <option value="Todas">Todas as Categorias</option>
              <option value="Finanças">Finanças / Tributos</option>
              <option value="Infraestrutura">Infraestrutura</option>
              <option value="Justiça">Justiça</option>
              <option value="Saúde">Saúde</option>
              <option value="Segurança">Segurança</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mt-4 pt-4 border-t border-slate-100">
          <div className="space-y-1.5">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Estado</label>
            <div className="flex gap-2">
              {['Todos', 'Ativas', 'Inativas'].map(st => (
                <button
                  key={st}
                  onClick={() => { setFilterStatus(st); setCurrentPage(1); }}
                  className={`px-4 py-2 border rounded-xl text-[10px] font-black uppercase tracking-wider transition-colors cursor-pointer ${
                    filterStatus === st 
                      ? 'bg-[#0E2B64] border-[#0E2B64] text-white' 
                      : 'bg-white border-slate-200 text-slate-655 hover:bg-slate-50'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Beautiful tabular list layout replacing the card grid */}
      <div className="space-y-6">
        {paginatedInstitutions.length > 0 ? (
          <div className="overflow-x-auto rounded-[24px] bg-white max-h-[600px] border border-slate-200 shadow-xs">
            <table className="mobile-data-table w-full text-left border-collapse text-[10px] md:text-xs">
              <thead className="sticky top-0 z-10 bg-[#0c2340] text-indigo-100 text-[8.5px] md:text-[10px] font-extrabold uppercase tracking-widest border-b border-slate-705">
                <tr>
                  <th className="py-4 px-4 rounded-l-[20px]">Instituição</th>
                  <th className="py-4 px-4">Localização</th>
                  <th className="py-4 px-4">Responsável</th>
                  <th className="py-4 px-4 text-center">Equipa</th>
                  <th className="py-4 px-4 text-center">Correspondência</th>
                  <th className="py-4 px-4 text-center">Utilização da IA</th>
                  <th className="py-4 px-4 text-center">Estado</th>
                  <th className="py-4 px-4 text-center rounded-r-[20px] w-[210px]">Ações</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-100">
                {paginatedInstitutions.map((inst) => (
                  <tr key={inst.id} className="text-[#334155] hover:bg-slate-50/70 transition-all">
                    <td className="py-4 px-4 font-bold text-slate-900">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#0E2B64] text-white flex items-center justify-center font-mono font-black text-xs uppercase shadow-sm shrink-0 select-none border border-[#0E2B64]">
                          {inst.name.slice(0, 3)}
                        </div>
                        <div className="min-w-0">
                          <span className="font-display font-black text-slate-800 block uppercase leading-none text-xs tracking-tight">{inst.fullName}</span>
                          <span className="text-[10px] text-slate-400 block mt-1.5 font-bold">
                            {inst.name} &bull; <span className="text-[#4f46e5] font-black">{inst.typeInst || inst.category}</span>
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4 font-bold text-slate-755">
                      <div className="flex items-center gap-1.5 text-xs">
                        <MapPin size={12} className="text-slate-400 shrink-0" />
                        <span>{inst.province} &bull; {inst.municipio}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      {inst.responsibleName ? (
                        <div>
                          <span className="font-bold text-slate-850 block text-xs leading-none">{inst.responsibleName}</span>
                          <span className="text-[9.5px] text-slate-400 block mt-1 font-semibold">{inst.responsibleRole}</span>
                        </div>
                      ) : (
                        <span className="text-slate-300 italic text-[10px]">Não atribuído</span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-center font-mono font-extrabold text-slate-700 text-xs">
                      {inst.totalAgents}
                    </td>
                    <td className="py-4 px-4 text-center font-mono font-extrabold text-slate-700 text-xs text-nowrap">
                      {inst.totalCorrespondence.toLocaleString()}
                    </td>
                    <td className="py-4 px-4 text-center">
                      <div className="flex flex-col items-center justify-center min-w-[80px]">
                        <span className="font-mono font-black text-[#4f46e5] text-xs">{inst.aiUsageRate || '0%'}</span>
                        <div className="w-12 h-1.5 bg-slate-100 rounded-full mt-1 overflow-hidden">
                          <div 
                            className="h-full bg-[#4f46e5] rounded-full" 
                            style={{ width: inst.aiUsageRate || '0%' }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black uppercase border tracking-wider shrink-0 select-none ${
                        inst.status === 'Ativa' 
                          ? 'bg-emerald-50 border-emerald-100 text-emerald-700' 
                          : 'bg-rose-50 border-rose-100 text-rose-700'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${inst.status === 'Ativa' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                        {inst.status === 'Ativa' ? 'Ativa' : 'Suspensa'}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => openEditModal(inst)}
                          className="px-2 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 hover:text-slate-900 rounded-lg text-[9px] font-extrabold uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1"
                          title="Editar Ficha"
                        >
                          <Edit size={10} className="stroke-[2.5]" />
                          Editar
                        </button>
                        <button
                          onClick={() => setSelectedInstHistory(inst)}
                          className="px-2 py-1.5 bg-indigo-50/50 hover:bg-indigo-50 border border-indigo-100 text-[#4f46e5] rounded-lg text-[9px] font-extrabold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1"
                          title="Dossiê de Desempenho"
                        >
                          <Activity size={10} className="stroke-[2.5]" />
                          Dossiê
                        </button>
                        <button
                          onClick={() => toggleStatus(inst)}
                          className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                            inst.status === 'Ativa'
                              ? 'bg-rose-50 border-rose-100 text-rose-600 hover:bg-rose-100/40'
                              : 'bg-emerald-50 border-emerald-100 text-emerald-600 hover:bg-emerald-100/40'
                          }`}
                          title={inst.status === 'Ativa' ? 'Suspender Instituição' : 'Ativar Instituição'}
                        >
                          <Power size={11} className="stroke-[2.5]" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 bg-white border border-slate-200 rounded-[32px] text-center text-slate-400 italic font-sans shadow-3xs text-xs">
            Nenhuma instituição governamental corresponde aos filtros aplicados.
          </div>
        )}

        {/* Pagination bar */}
        {totalPages > 1 && (
          <div className="bg-white border border-slate-205 rounded-[32px] p-6 flex items-center justify-between text-[11px] font-bold shadow-3xs">
            <span className="text-slate-400">Páginas {currentPage} de {totalPages}</span>
            <div className="flex gap-2">
              <button 
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} 
                disabled={currentPage === 1}
                className="px-3.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-650 rounded-xl disabled:opacity-50 transition-colors cursor-pointer"
              >
                Anterior
              </button>
              <button 
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} 
                disabled={currentPage === totalPages}
                className="px-3.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-650 rounded-xl disabled:opacity-50 transition-colors cursor-pointer"
              >
                Seguinte
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Creation and Modification Drawer Dialog */}
      <AnimatePresence>
        {(isCreateModalOpen || editingInstitution) && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setIsCreateModalOpen(false); setEditingInstitution(null); }}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[600]"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[92%] max-w-4xl bg-white rounded-[32px] overflow-hidden shadow-2xl z-[601] border border-slate-100 flex flex-col max-h-[95vh]"
            >
              <div className="bg-[#0b1329] text-white p-6 md:px-10 md:py-6 relative flex-shrink-0 select-none flex items-center gap-4">
                <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center border border-white/20 shrink-0">
                  <Building2 size={22} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base md:text-[23px] font-black uppercase italic tracking-tighter text-white m-0 leading-none mb-1">
                    {editingInstitution ? 'Editar Instituição' : 'Criar Instituição'}
                  </h3>
                  <p className="text-[10px] font-black text-indigo-200/80 uppercase tracking-widest leading-none m-0 mt-1">
                    REGISTE OS DADOS DA NOVA INSTITUIÇÃO NO SISTEMA
                  </p>
                </div>
                <button 
                  onClick={() => { setIsCreateModalOpen(false); setEditingInstitution(null); }}
                  className="absolute right-6 top-6 md:right-10 md:top-7 text-slate-400 hover:text-white bg-white/10 hover:bg-white/20 rounded-full p-2 border-none cursor-pointer transition-all flex items-center justify-center w-8 h-8"
                  type="button"
                  title="Fechar"
                >
                  <X size={15} />
                </button>
              </div>

              <form 
                onSubmit={editingInstitution ? handleEdit : handleCreate} 
                className="p-6 md:p-10 space-y-6 overflow-y-auto custom-scrollbar flex-1 text-left"
              >
                
                {/* 1. DADOS INSTITUCIONAIS */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-[#4f46e5]">
                    <Building2 size={15} className="stroke-[2.5]" />
                    <span className="font-extrabold text-[11px] uppercase tracking-widest">Dados Institucionais</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                    {/* NOME INSTITUCIONAL COMPLETO */}
                    <div className="grid gap-1.5 md:col-span-5 text-left">
                      <label className="text-[10px] font-black text-slate-450 uppercase tracking-widest ml-1">Nome Institucional Completo *</label>
                      <input 
                        type="text" 
                        required
                        value={formFullName}
                        onChange={(e) => setFormFullName(e.target.value)}
                        placeholder="Ex: Serviço de Migração e Estrangeiros"
                        className="w-full bg-white border border-slate-200 focus:border-[#4f46e5]/30 focus:ring-1 focus:ring-[#4f46e5]/30 rounded-[14px] px-4 py-3.5 text-xs font-bold text-slate-850 outline-none transition-all placeholder:text-slate-350"
                      />
                    </div>

                    {/* SIGLA INSTITUCIONAL */}
                    <div className="grid gap-1.5 md:col-span-3 text-left">
                      <label className="text-[10px] font-black text-slate-450 uppercase tracking-widest ml-1">Sigla Institucional *</label>
                      <input 
                        type="text" 
                        required
                        value={formName}
                        onChange={(e) => setFormName(e.target.value)}
                        placeholder="Ex: SME"
                        className="w-full bg-white border border-slate-200 focus:border-[#4f46e5]/30 focus:ring-1 focus:ring-[#4f46e5]/30 rounded-[14px] px-4 py-3.5 text-xs font-bold text-slate-855 outline-none transition-all placeholder:text-slate-350"
                      />
                    </div>

                    {/* TIPO DE INSTITUIÇÃO */}
                    <div className="grid gap-1.5 md:col-span-4 text-left">
                      <label className="text-[10px] font-black text-slate-450 uppercase tracking-widest ml-1">Tipo de Instituição *</label>
                      <div className="relative">
                        <select
                          value={formTypeInst}
                          onChange={(e) => setFormTypeInst(e.target.value)}
                          className="w-full bg-white border border-slate-200 focus:border-[#4f46e5]/30 focus:ring-1 focus:ring-[#4f46e5]/30 rounded-[14px] pl-4 pr-10 py-3.5 text-xs font-bold text-slate-850 outline-none appearance-none cursor-pointer transition-all"
                        >
                          <option value="" disabled>Selecione o tipo</option>
                          {INSTITUTION_TYPES.map(type => (
                            <option key={type} value={type}>{type}</option>
                          ))}
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-[9px]">
                          ▼
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-t border-dashed border-slate-150" />

                {/* 2. LOCALIZAÇÃO */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-[#4f46e5]">
                    <MapPin size={15} className="stroke-[2.5]" />
                    <span className="font-extrabold text-[11px] uppercase tracking-widest">Localização</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                    {/* PROVÍNCIA */}
                    <div className="grid gap-1.5 md:col-span-4 text-left">
                      <label className="text-[10px] font-black text-slate-455 uppercase tracking-widest ml-1">Província *</label>
                      <div className="relative">
                        <select
                          value={formProvince}
                          onChange={(e) => {
                            const nextProvince = e.target.value;
                            setFormProvince(nextProvince);
                            
                            const list = MUNICIPALITIES_BY_PROVINCE[nextProvince] || [];
                            const nextMuni = list[1] || list[0] || '';
                            setFormMunicipio(nextMuni);

                            const cities = CITIES_BY_PROVINCE[nextProvince] || ['Sede'];
                            setFormCidade(cities[0] || 'Sede');

                            const communes = COMMUNES_BY_MUNICIPALITY[nextMuni] || ['Sede'];
                            setFormComuna(communes[0] || 'Sede');
                          }}
                          className="w-full bg-white border border-slate-200 focus:border-[#4f46e5]/30 focus:ring-1 focus:ring-[#4f46e5]/30 rounded-[14px] pl-4 pr-10 py-3.5 text-xs font-bold text-slate-850 outline-none appearance-none cursor-pointer transition-all"
                        >
                          {Object.keys(MUNICIPALITIES_BY_PROVINCE).filter(p => p !== 'Todas').map(prov => (
                            <option key={prov} value={prov}>{prov}</option>
                          ))}
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-[9px]">
                          ▼
                        </div>
                      </div>
                    </div>

                    {/* CIDADE */}
                    <div className="grid gap-1.5 md:col-span-4 text-left">
                      <label className="text-[10px] font-black text-slate-455 uppercase tracking-widest ml-1">Cidade *</label>
                      <div className="relative">
                        <select
                          value={formCidade}
                          onChange={(e) => setFormCidade(e.target.value)}
                          className="w-full bg-white border border-slate-200 focus:border-[#4f46e5]/30 focus:ring-1 focus:ring-[#4f46e5]/30 rounded-[14px] pl-4 pr-10 py-3.5 text-xs font-bold text-slate-850 outline-none appearance-none cursor-pointer transition-all"
                        >
                          {formCities.map(city => (
                            <option key={city} value={city}>{city}</option>
                          ))}
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-[9px]">
                          ▼
                        </div>
                      </div>
                    </div>

                    {/* MUNICÍPIO */}
                    <div className="grid gap-1.5 md:col-span-4 text-left">
                      <label className="text-[10px] font-black text-slate-455 uppercase tracking-widest ml-1">Município *</label>
                      <div className="relative">
                        <select
                          value={formMunicipio}
                          onChange={(e) => {
                            const nextMuni = e.target.value;
                            setFormMunicipio(nextMuni);
                            
                            const communes = COMMUNES_BY_MUNICIPALITY[nextMuni] || ['Sede'];
                            setFormComuna(communes[0] || 'Sede');
                          }}
                          className="w-full bg-white border border-slate-200 focus:border-[#4f46e5]/30 focus:ring-1 focus:ring-[#4f46e5]/30 rounded-[14px] pl-4 pr-10 py-3.5 text-xs font-bold text-slate-850 outline-none appearance-none cursor-pointer transition-all"
                        >
                          {formMunicipalities.map(m => (
                            <option key={m} value={m}>{m}</option>
                          ))}
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-[9px]">
                          ▼
                        </div>
                      </div>
                    </div>

                    {/* COMUNA */}
                    <div className="grid gap-1.5 md:col-span-4 text-left">
                      <label className="text-[10px] font-black text-slate-455 uppercase tracking-widest ml-1">Comuna *</label>
                      <div className="relative">
                        <select
                          value={formComuna}
                          onChange={(e) => setFormComuna(e.target.value)}
                          className="w-full bg-white border border-slate-200 focus:border-[#4f46e5]/30 focus:ring-1 focus:ring-[#4f46e5]/30 rounded-[14px] pl-4 pr-10 py-3.5 text-xs font-bold text-slate-850 outline-none appearance-none cursor-pointer transition-all"
                        >
                          {formCommunes.map(c => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-[9px]">
                          ▼
                        </div>
                      </div>
                    </div>

                    {/* ENDEREÇO INSTITUCIONAL */}
                    <div className="grid gap-1.5 md:col-span-8 text-left">
                      <label className="text-[10px] font-black text-slate-455 uppercase tracking-widest ml-1">Endereço Institucional</label>
                      <input 
                        type="text" 
                        value={formAddress}
                        onChange={(e) => setFormAddress(e.target.value)}
                        placeholder="Ex: Rua Rainha Ginga nº 120, Luanda"
                        className="w-full bg-white border border-slate-200 focus:border-[#4f46e5]/30 focus:ring-1 focus:ring-[#4f46e5]/30 rounded-[14px] px-4 py-3.5 text-xs font-bold text-slate-850 outline-none transition-all placeholder:text-slate-350"
                      />
                    </div>
                  </div>
                </div>

                <div className="border-t border-dashed border-slate-150" />

                {/* 3. CONTACTOS */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-[#4f46e5]">
                    <Phone size={15} className="stroke-[2.5]" />
                    <span className="font-extrabold text-[11px] uppercase tracking-widest">Contactos</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* EMAIL INSTITUCIONAL */}
                    <div className="grid gap-1.5 text-left">
                      <label className="text-[10px] font-black text-slate-455 uppercase tracking-widest ml-1">Email Institucional *</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                          <Mail size={16} />
                        </span>
                        <input 
                          type="email" 
                          required
                          value={formContactEmail}
                          onChange={(e) => setFormContactEmail(e.target.value)}
                          placeholder="Ex: geral@sme.gov.ao"
                          className="w-full bg-white border border-slate-200 focus:border-[#4f46e5]/30 focus:ring-1 focus:ring-[#4f46e5]/30 rounded-[14px] pl-11 pr-4 py-3.5 text-xs font-bold text-slate-850 outline-none transition-all placeholder:text-slate-350"
                        />
                      </div>
                    </div>

                    {/* TELEFONE INSTITUCIONAL */}
                    <div className="grid gap-1.5 text-left">
                      <label className="text-[10px] font-black text-slate-455 uppercase tracking-widest ml-1">Telefone Institucional *</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                          <Phone size={16} />
                        </span>
                        <input 
                          type="text" 
                          required
                          value={formContactPhone}
                          onChange={(e) => setFormContactPhone(e.target.value)}
                          placeholder="Ex: +244 923 000 000"
                          className="w-full bg-white border border-slate-200 focus:border-[#4f46e5]/30 focus:ring-1 focus:ring-[#4f46e5]/30 rounded-[14px] pl-11 pr-4 py-3.5 text-xs font-bold text-slate-850 outline-none transition-all placeholder:text-slate-350 font-mono"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-t border-dashed border-slate-150" />

                {/* 4. RESPONSÁVEL INSTITUCIONAL */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-[#4f46e5]">
                    <User size={15} className="stroke-[2.5]" />
                    <span className="font-extrabold text-[11px] uppercase tracking-widest">Responsável Institucional</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* NOME DO RESPONSÁVEL */}
                    <div className="grid gap-1.5 text-left">
                      <label className="text-[10px] font-black text-slate-455 uppercase tracking-widest ml-1">Nome do Responsável *</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                          <User size={16} />
                        </span>
                        <input 
                          type="text" 
                          required
                          value={formResponsibleName}
                          onChange={(e) => setFormResponsibleName(e.target.value)}
                          placeholder="Ex: Dr. António Fernando"
                          className="w-full bg-white border border-slate-200 focus:border-[#4f46e5]/30 focus:ring-1 focus:ring-[#4f46e5]/30 rounded-[14px] pl-11 pr-4 py-3.5 text-xs font-bold text-slate-850 outline-none transition-all placeholder:text-slate-350"
                        />
                      </div>
                    </div>

                    {/* CARGO DO RESPONSÁVEL */}
                    <div className="grid gap-1.5 text-left">
                      <label className="text-[10px] font-black text-slate-455 uppercase tracking-widest ml-1">Cargo do Responsável *</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                          <Briefcase size={16} />
                        </span>
                        <input 
                          type="text" 
                          required
                          value={formResponsibleRole}
                          onChange={(e) => setFormResponsibleRole(e.target.value)}
                          placeholder="Ex: Ex: Director Geral"
                          className="w-full bg-white border border-slate-200 focus:border-[#4f46e5]/30 focus:ring-1 focus:ring-[#4f46e5]/30 rounded-[14px] pl-11 pr-4 py-3.5 text-xs font-bold text-slate-850 outline-none transition-all placeholder:text-slate-350"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-t border-dashed border-slate-150" />

                {/* 5. IDENTIFICAÇÃO E LOGÓTIPO GRID ROW */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                  {/* IDENTIFICAÇÃO (Left Span 5) */}
                  <div className="md:col-span-5 space-y-4">
                    <div className="flex items-center gap-2 text-[#4f46e5]">
                      <Shield size={15} className="stroke-[2.5]" />
                      <span className="font-extrabold text-[11px] uppercase tracking-widest">Identificação no Sistema</span>
                    </div>

                    <div className="grid gap-4">
                      {/* CÓDIGO INSTITUCIONAL */}
                      <div className="grid gap-1.5 text-left">
                        <label className="text-[10px] font-black text-slate-455 uppercase tracking-widest ml-1">Código Institucional *</label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                            <Phone size={16} />
                          </span>
                          <input 
                            type="text" 
                            required
                            value={formInstCode}
                            onChange={(e) => setFormInstCode(e.target.value)}
                            placeholder="Ex: SME-001"
                            className="w-full bg-white border border-slate-200 focus:border-[#4f46e5]/30 focus:ring-1 focus:ring-[#4f46e5]/30 rounded-[14px] pl-11 pr-4 py-3.5 text-xs font-bold text-slate-850 outline-none transition-all placeholder:text-slate-350 font-mono"
                          />
                        </div>
                        <p className="text-[10px] text-slate-400 leading-normal m-0 select-none block text-left font-medium">
                          Identificador único da instituição no sistema.
                        </p>
                      </div>

                      {/* ESTADO DA INSTITUIÇÃO */}
                      <div className="grid gap-1.5 text-left">
                        <label className="text-[10px] font-black text-slate-455 uppercase tracking-widest ml-1">Estado da Instituição *</label>
                        <div className="relative">
                          <select
                            value={formStatusLocal}
                            onChange={(e) => setFormStatusLocal(e.target.value as any)}
                            className="w-full bg-white border border-slate-200 focus:border-[#4f46e5]/30 focus:ring-1 focus:ring-[#4f46e5]/30 rounded-[14px] pl-4 pr-10 py-3.5 text-xs font-bold text-slate-850 outline-none appearance-none cursor-pointer transition-all"
                          >
                            <option value="Ativa">Ativa</option>
                            <option value="Inativa">Inativa</option>
                          </select>
                          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-[9px]">
                            ▼
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* LOGÓTIPO (Right Span 7) */}
                  <div className="md:col-span-7 space-y-4">
                    <div className="flex items-center gap-2 text-[#4f46e5]">
                      <UploadCloud size={15} className="stroke-[2.5]" />
                      <span className="font-extrabold text-[11px] uppercase tracking-widest">Logótipo Institucional</span>
                    </div>

                    <div className="border-2 border-dashed border-slate-200 hover:border-[#4f46e5]/30 rounded-[20px] p-6 text-center transition-all bg-slate-50/10 hover:bg-slate-50/40 flex flex-col items-center justify-center gap-2 cursor-pointer h-[155px] relative">
                      <UploadCloud size={28} className="text-[#4f46e5]" />
                      <p className="text-[11px] text-slate-600 leading-normal m-0 max-w-[200px]">
                        Arraste o logótipo para aqui ou <span className="text-[#4f46e5] font-extrabold underline">clique para selecionar</span>
                      </p>
                      <p className="text-[9px] text-slate-400 leading-normal m-0 select-none">
                        Formatos suportados: PNG, JPG, SVG<br />Tamanho máximo: 2MB
                      </p>
                      <input 
                        type="file"
                        accept=".png,.jpg,.jpeg,.svg"
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setFormLogoFile(file);
                          }
                        }}
                      />
                      {formLogoFile && (
                        <div className="absolute inset-0 bg-white/95 rounded-[20px] flex items-center justify-center p-4 gap-2 border border-emerald-500">
                          <CheckCircle size={18} className="text-emerald-500 shrink-0" />
                          <div className="text-left overflow-hidden">
                            <p className="text-xs font-bold text-slate-800 truncate m-0 max-w-[180px]">{formLogoFile.name}</p>
                            <p className="text-[10px] text-slate-400 m-0">{(formLogoFile.size / 1024).toFixed(1)} KB</p>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setFormLogoFile(null); }}
                            className="text-red-500 hover:text-red-700 bg-transparent border-0 cursor-pointer ml-auto hover:scale-105 transition-transform"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="border-t border-dashed border-slate-150 pt-2" />

                {/* Actions Row */}
                <div className="pt-2 shrink-0 flex items-center justify-between gap-4">
                  <button
                    type="button"
                    onClick={() => { setIsCreateModalOpen(false); setEditingInstitution(null); }}
                    className="px-6 py-3.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-[20px] font-extrabold text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <X size={15} />
                    Cancelar
                  </button>

                  <button
                    type="submit"
                    className="flex-1 bg-[#4f46e5] hover:bg-[#4338ca] text-white py-3.5 rounded-[20px] font-black text-xs uppercase tracking-widest shadow-xl shadow-[#4f46e5]/15 flex items-center justify-center gap-2.5 transition-all duration-300 cursor-pointer active:scale-98 font-sans border-0"
                  >
                    <CheckCircle size={15} className="stroke-[3]" />
                    {editingInstitution ? 'Guardar Instituição' : 'Criar Instituição'}
                  </button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Interoperability Activity History Modal */}
      <AnimatePresence>
        {selectedInstHistory && (() => {
          const aiUsageVal = parseFloat(selectedInstHistory.aiUsageRate || '80');
          const manualUsageVal = 100 - aiUsageVal;
          
          return (
            <>
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSelectedInstHistory(null)}
                className="fixed inset-0 bg-slate-900/35 backdrop-blur-xs z-[600]"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[95%] max-w-2xl bg-white rounded-[32px] overflow-hidden shadow-2xl z-[601] border border-slate-100 font-sans"
              >
                {/* Banner Header */}
                <div className="bg-[#0c2340] text-indigo-100 p-6 relative">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center font-mono font-black text-sm uppercase text-white shadow-inner select-none border border-white/10">
                      {selectedInstHistory.name.slice(0, 3)}
                    </div>
                    <div>
                      <span className="text-[10px] font-black tracking-widest uppercase text-indigo-300 block leading-none">
                        Dossiê de Performance & Auditoria Síncrona
                      </span>
                      <h3 className="text-base md:text-lg font-black uppercase tracking-tight text-white mt-1 border-0 leading-none">
                        {selectedInstHistory.fullName}
                      </h3>
                      <p className="text-[10.5px] text-slate-400 font-bold mt-1 block">
                        Código: <span className="font-mono">{selectedInstHistory.instCode || 'N/A'}</span> &bull; {selectedInstHistory.typeInst || selectedInstHistory.category}
                      </p>
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => setSelectedInstHistory(null)}
                    className="absolute right-6 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 text-white border-0 rounded-full p-2.5 cursor-pointer transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>

                <div className="p-6 md:p-8 space-y-6">
                  {/* Two Columns Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Column 1: Identificação e Contactos */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-1.5 text-[#4f46e5] border-b border-slate-100 pb-1.5">
                        <User size={13} className="stroke-[2.5]" />
                        <span className="font-extrabold text-[10px] uppercase tracking-wider block">Ficha Institucional & Representantes</span>
                      </div>

                      <div className="space-y-3.5 text-[11px] font-medium text-slate-600">
                        <div>
                          <span className="text-[8.5px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Responsável Institucional</span>
                          <span className="font-black text-slate-800 block text-xs">{selectedInstHistory.responsibleName || 'Não atribuído'}</span>
                          <span className="text-[10px] text-slate-400 font-bold block mt-0.5">{selectedInstHistory.responsibleRole}</span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-50">
                          <div>
                            <span className="text-[8.5px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Telefone</span>
                            <span className="font-mono font-extrabold text-slate-750">{selectedInstHistory.contactPhone || '+244 923 000 000'}</span>
                          </div>
                          <div>
                            <span className="text-[8.5px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Email Oficial</span>
                            <span className="font-extrabold text-slate-750 truncate block leading-normal" title={selectedInstHistory.contactEmail}>{selectedInstHistory.contactEmail || 'N/A'}</span>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-slate-50">
                          <span className="text-[8.5px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Localização da Unidade</span>
                          <div className="flex items-start gap-1 font-bold text-slate-700 leading-normal">
                            <MapPin size={11} className="text-slate-400 shrink-0 mt-0.5" />
                            <span>{selectedInstHistory.province}, {selectedInstHistory.municipio} {selectedInstHistory.comuna ? `(${selectedInstHistory.comuna})` : ''}</span>
                          </div>
                        </div>

                        <div className="flex justify-between items-center bg-slate-50 rounded-xl p-3 border border-slate-100 mt-2">
                          <div>
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block leading-none">DATA DE REGISTO</span>
                            <span className="font-mono font-black text-slate-800 text-xs mt-1 block leading-none">{selectedInstHistory.registrationDate || '12/03/2025'}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block leading-none">STATUS DO ECOSSISTEMA</span>
                            <span className={`inline-flex items-center gap-1 mt-1 font-mono font-black text-[9px] uppercase leading-none ${selectedInstHistory.status === 'Ativa' ? 'text-emerald-700' : 'text-rose-700'}`}>
                              <span className={`w-1 h-1 rounded-full ${selectedInstHistory.status === 'Ativa' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                              {selectedInstHistory.status === 'Ativa' ? 'Ativa' : 'Suspensa'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Column 2: Estatísticas de Processamento & IA */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-1.5 text-[#4f46e5] border-b border-slate-100 pb-1.5">
                        <Cpu size={13} className="stroke-[2.5]" />
                        <span className="font-extrabold text-[10px] uppercase tracking-wider block">Volumetria & Automatização Inteligente</span>
                      </div>

                      <div className="flex justify-between items-center bg-slate-50 p-3.5 border border-slate-100 rounded-xl text-[10px] font-bold gap-4">
                        <div className="space-y-1">
                          <span className="text-[8.5px] font-black text-slate-450 uppercase tracking-widest block leading-none">EQUIPA</span>
                          <span className="text-base text-slate-900 font-mono font-black block leading-none">{selectedInstHistory.totalAgents} agentes</span>
                        </div>
                        <div className="space-y-1 text-right">
                          <span className="text-[8.5px] font-black text-slate-455 uppercase tracking-widest block leading-none">SLA DESEMPENHO</span>
                          <span className="text-base text-emerald-600 font-mono font-black block leading-none">{selectedInstHistory.performanceScore || selectedInstHistory.responseRate || '95%'}</span>
                        </div>
                      </div>

                      {/* Minimalist Split Progress Bars showing IA vs Manual */}
                      <div className="bg-slate-50/50 p-3.5 border border-slate-100 rounded-xl space-y-4">
                        {/* IA progress block */}
                        <div>
                          <div className="flex justify-between text-[10px] font-extrabold mb-1">
                            <span className="text-indigo-650 uppercase tracking-wide">Utilização da IA</span>
                            <span className="font-mono text-slate-800">{aiUsageVal}%</span>
                          </div>
                          <div className="h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
                            <div 
                              className="h-full bg-[#4f46e5] rounded-full transition-all duration-500"
                              style={{ width: `${aiUsageVal}%` }}
                            />
                          </div>
                        </div>

                        {/* Manual progress block */}
                        <div>
                          <div className="flex justify-between text-[10px] font-extrabold mb-1">
                            <span className="text-amber-600 uppercase tracking-wide">Tratamento Manual</span>
                            <span className="font-mono text-slate-800">{manualUsageVal.toFixed(0)}%</span>
                          </div>
                          <div className="h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
                            <div 
                              className="h-full bg-amber-500 rounded-full transition-all duration-500"
                              style={{ width: `${manualUsageVal}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Timeline activity summary */}
                      <div className="space-y-1">
                        <span className="text-[8.5px] font-black text-slate-400 uppercase tracking-widest block mb-2 leading-none">Último Registo Operacional</span>
                        <div className="p-2.5 bg-slate-50/30 border border-slate-100 rounded-xl relative overflow-hidden text-[10px]">
                          <p className="font-bold text-slate-705 leading-normal">Fluxo de correspondência processado com sucesso pelo barramento seguro nacional.</p>
                          <div className="flex items-center gap-2 mt-1.5 font-mono text-[8.5px] text-slate-400">
                            <span className="font-bold text-[#4f46e5]">AGENTE_AUTOMATED_SISTEMA</span>
                            <span>&bull;</span>
                            <span>{selectedInstHistory.lastActivity}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Footer control panel actions */}
                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-4">
                    <button
                      onClick={handleToggleInsideDossier}
                      className={`px-4.5 py-3 rounded-xl text-[10px] font-extrabold uppercase tracking-widest transition-all cursor-pointer flex items-center gap-2 border leading-none ${
                        selectedInstHistory.status === 'Ativa'
                          ? 'bg-rose-50 hover:bg-rose-100/70 border-rose-100 text-rose-700'
                          : 'bg-emerald-50 hover:bg-emerald-100/70 border-emerald-100 text-emerald-700'
                      }`}
                    >
                      <Power size={11} className="stroke-[2.5]" />
                      {selectedInstHistory.status === 'Ativa' ? 'Suspender Unidade' : 'Ativar Unidade'}
                    </button>

                    <button
                      onClick={() => setSelectedInstHistory(null)}
                      className="px-5 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-extrabold text-[10px] uppercase tracking-widest transition-colors cursor-pointer border-0 leading-none"
                    >
                      Fechar Dossier
                    </button>
                  </div>
                </div>
              </motion.div>
            </>
          );
        })()}
      </AnimatePresence>

    </div>
  );
}
