import React, { createContext, useContext, useState, useEffect } from 'react';
import { Institution, InstitutionStatus } from '../types';
import { MOCK_INSTITUTIONS } from '../constants/mocks';
import { shouldUseMockFallback } from '../config/runtime';

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
  const [institutions, setInstitutions] = useState<Institution[]>(() => {
    const demoEnabled = shouldUseMockFallback();
    const saved = localStorage.getItem("correio_digital_institutions");
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as Institution[];
        // 2026-09-03 — MIGRAÇÃO: garantir que todas as instituições têm fullName.
        // Instituições antigas podem não ter este campo, o que faz com que o nome
        // desapareça após uma edição. Se fullName estiver vazio, usa name como fallback.
        const migrated = parsed.map(inst => ({
          ...inst,
          fullName: inst.fullName || inst.name || 'Instituição',
        }));
        if (!demoEnabled) {
          // Modo real nunca reutiliza as entidades canónicas de demonstração
          // guardadas localmente por uma sessão anterior.
          const demoIds = new Set(CANONICAL_INSTITUTIONS.map(inst => inst.id));
          const filtered = migrated.filter(inst => !demoIds.has(inst.id));
          if (JSON.stringify(filtered) !== JSON.stringify(migrated)) {
            // Guarda a versão migrada no localStorage
            setTimeout(() => localStorage.setItem("correio_digital_institutions", JSON.stringify(filtered)), 0);
          }
          return filtered;
        }
        const hasInapem = migrated.some(inst => inst.name === 'INAPEM' || inst.id === 'inst-inapem');
        if (!hasInapem) {
          const canonicalInapem = CANONICAL_INSTITUTIONS.find(inst => inst.name === 'INAPEM');
          if (canonicalInapem) migrated.push(canonicalInapem);
        }
        const inapemIndex = migrated.findIndex(inst => inst.name === 'INAPEM' || inst.id === 'inst-inapem');
        if (inapemIndex > 0) {
          const [inapem] = migrated.splice(inapemIndex, 1);
          migrated.unshift(inapem);
        }
        // Guarda a versão migrada no localStorage
        setTimeout(() => localStorage.setItem("correio_digital_institutions", JSON.stringify(migrated)), 0);
        return migrated;
      } catch (e) {
        // use default
      }
    }
    return shouldUseMockFallback() ? CANONICAL_INSTITUTIONS : [];
  });

  useEffect(() => {
    localStorage.setItem("correio_digital_institutions", JSON.stringify(institutions));
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
  };

  const updateInstitutionStatus = (id: string, status: InstitutionStatus | string) => {
    setInstitutions(prev => prev.map(inst => inst.id === id ? { ...inst, status } : inst));
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
