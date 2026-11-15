import React, { createContext, useContext, useState, useEffect } from 'react';
import { Institution, InstitutionStatus } from '../types';
import { MOCK_INSTITUTIONS } from '../constants/mocks';
import { shouldUseMockFallback } from '../config/runtime';
import {
  listarInstituicoes,
  criarInstituicao,
  actualizarInstituicao,
  eliminarInstituicao,
  semearInstituicoes,
} from './institutionService';

export const CANONICAL_INSTITUTIONS: Institution[] = MOCK_INSTITUTIONS;

// Helper to filter, list, group institutions
export const listInstitutions = (list: Institution[]) => list;

export const filterInstitutions = (
  list: Institution[],
  search: string,
  category: string,
  status: string,
  province: string
) => {
  return list.filter(inst => {
    // Search
    const matchSearch = 
      inst.name.toLowerCase().includes(search.toLowerCase()) ||
      inst.fullName.toLowerCase().includes(search.toLowerCase()) ||
      (inst.responsibleName && inst.responsibleName.toLowerCase().includes(search.toLowerCase())) ||
      inst.id.toLowerCase().includes(search.toLowerCase());
    
    // Category
    const matchCategory = category === 'Todas' || category === '' || inst.category === category;
    
    // Status
    const matchStatus = status === 'Todos' || status === '' || inst.status === status;
    
    // Province
    const matchProvince = province === 'Todas' || province === '' || inst.province === province;

    return matchSearch && matchCategory && matchStatus && matchProvince;
  });
};

export const groupInstitutionsByCategory = (list: Institution[]) => {
  return list.reduce((acc, inst) => {
    const cat = inst.category;
    if (!acc[cat]) {
      acc[cat] = [];
    }
    acc[cat].push(inst);
    return acc;
  }, {} as Record<string, Institution[]>);
};

export const groupInstitutionsByProvince = (list: Institution[]) => {
  return list.reduce((acc, inst) => {
    const prov = inst.province;
    if (!acc[prov]) {
      acc[prov] = [];
    }
    acc[prov].push(inst);
    return acc;
  }, {} as Record<string, Institution[]>);
};

// Institutional Applet State Context
interface InstitutionContextType {
  institutions: Institution[];
  setInstitutions: React.Dispatch<React.SetStateAction<Institution[]>>;
  addInstitution: (inst: Omit<Institution, 'id' | 'totalCorrespondence' | 'totalAgents' | 'lastActivity' | 'responseRate' | 'registrationDate' | 'aiUsageRate' | 'performanceScore'>) => void;
  updateInstitutionStatus: (id: string, status: InstitutionStatus | string) => void;
  getInstitutionByName: (name: string) => Institution | undefined;
  getInstitutionById: (id: string) => Institution | undefined;
}

const InstitutionContext = createContext<InstitutionContextType | undefined>(undefined);

export const InstitutionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 2026-11-15 — a lista passa a viver na tabela `public.institutions`.
  // Arranca VAZIA (ou com o que houver em localStorage como cache de arranque)
  // e hidrata da base no efeito abaixo. Só cai no catálogo de demonstração
  // quando o modo demo está activo (shouldUseMockFallback).
  const [carregadoDaBase, setCarregadoDaBase] = useState(false);
  const [institutions, setInstitutions] = useState<Institution[]>(() => {
    // Só o catálogo de demonstração quando NÃO existe lista guardada. Uma lista
    // guardada vazia ([]) é uma decisão do utilizador (eliminou a última
    // instituição): antes voltava a carregar todas as de demonstração ao
    // atualizar a página, e a instituição eliminada reaparecia.
    const saved = typeof localStorage !== 'undefined' ? localStorage.getItem("correio_digital_institutions") : null;
    if (saved !== null) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return (parsed as Institution[]).map(inst => ({
            ...inst,
            fullName: inst.fullName || inst.name || 'Instituição',
          }));
        }
      } catch (e) {
        // lista corrompida: usa o catálogo canónico
      }
    }
    return CANONICAL_INSTITUTIONS;
  });

  // Hidratação a partir da base (uma vez, no arranque).
  useEffect(() => {
    let vivo = true;
    (async () => {
      const daBase = await listarInstituicoes();
      if (!vivo) return;
      if (daBase === null) {
        // Sem nuvem: mantém-se o que estiver em localStorage. Em modo demo,
        // o catálogo canónico serve de conteúdo.
        setCarregadoDaBase(true);
        return;
      }
      if (daBase.length === 0 && shouldUseMockFallback()) {
        // Modo demonstração: semeia a base com o catálogo, uma única vez.
        const n = await semearInstituicoes(MOCK_INSTITUTIONS);
        if (n > 0) {
          const relido = await listarInstituicoes();
          if (vivo && relido) setInstitutions(relido);
          setCarregadoDaBase(true);
          return;
        }
      }
      setInstitutions(daBase);
      setCarregadoDaBase(true);
    })();
    return () => { vivo = false; };
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("correio_digital_institutions", JSON.stringify(institutions));
    } catch (e) {
      // armazenamento cheio/indisponível: a lista continua em memória nesta sessão
      console.warn('[INSTITUIÇÕES] não foi possível gravar a lista localmente:', e);
    }
  }, [institutions]);

  const addInstitution = (newFields: Omit<Institution, 'id' | 'totalCorrespondence' | 'totalAgents' | 'lastActivity' | 'responseRate' | 'registrationDate' | 'aiUsageRate' | 'performanceScore'>) => {
    const id = `inst-${newFields.name.toLowerCase()}-${Math.floor(Math.random() * 900) + 100}`;
    const newInst: Institution = {
      ...newFields,
      id,
      totalCorrespondence: 0,
      totalAgents: 1,
      lastActivity: "Agora mesmo",
      responseRate: "100%",
      registrationDate: new Date().toLocaleDateString('pt-AO'),
      aiUsageRate: "50%",
      performanceScore: "100%"
    };
    setInstitutions(prev => [...prev, newInst]);
    // Espelha na base; se falhar, a linha fica só local e a consola avisa.
    void criarInstituicao(newInst as Omit<Institution, 'id'>).then((criada) => {
      if (!criada) {
        console.warn('[INSTITUIÇÕES] criação não persistiu na base central (ficou apenas local).');
        return;
      }
      // Troca o id local pelo id da base, para editar/eliminar apontarem certo.
      setInstitutions(prev => prev.map(i => (i.id === id ? { ...i, id: criada.id } : i)));
    });
  };

  const updateInstitutionStatus = (id: string, status: InstitutionStatus | string) => {
    setInstitutions(prev => prev.map(inst => inst.id === id ? { ...inst, status } : inst));
    void actualizarInstituicao(id, { status } as Partial<Institution>);
  };

  const getInstitutionByName = (name: string) => {
    return institutions.find(inst => inst.name.toLowerCase() === name.toLowerCase());
  };

  const getInstitutionById = (id: string) => {
    return institutions.find(inst => inst.id === id);
  };

  return React.createElement(
    InstitutionContext.Provider,
    {
      value: {
        institutions,
        setInstitutions,
        addInstitution,
        updateInstitutionStatus,
        getInstitutionByName,
        getInstitutionById
      }
    },
    children
  );
};

export const useInstitutions = () => {
  const context = useContext(InstitutionContext);
  if (!context) {
    throw new Error("useInstitutions must be used within an InstitutionProvider");
  }
  return context;
};
