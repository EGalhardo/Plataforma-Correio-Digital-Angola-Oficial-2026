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

export const isDeletedInstitution = (inst: Institution | { id?: string; instCode?: string; name?: string }): boolean => {
  if (!inst) return true;
  if (typeof localStorage === 'undefined') return false;
  if (inst.id && localStorage.getItem('cda_deleted_inst_' + inst.id)) return true;
  const code = (inst.instCode || '').trim().toUpperCase();
  if (code && (localStorage.getItem('cda_deleted_inst_' + code) || localStorage.getItem('cda_deleted_' + code))) return true;
  const nameKey = (inst.name || '').trim().toUpperCase().replace(/\s+/g, '-');
  if (nameKey && (localStorage.getItem('cda_deleted_inst_' + nameKey) || localStorage.getItem('cda_deleted_' + nameKey))) return true;
  return false;
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
    const saved = typeof localStorage !== 'undefined' ? localStorage.getItem("correio_digital_institutions") : null;
    if (saved !== null) {
      try {
        const parsed = JSON.parse(saved) as Institution[];
        if (Array.isArray(parsed)) {
          return parsed.filter(inst => !isDeletedInstitution(inst)).map(inst => ({
            ...inst,
            fullName: inst.fullName || inst.name || 'Instituição',
          }));
        }
      } catch (e) {
        // use canonical default
      }
    }
    return CANONICAL_INSTITUTIONS.filter(inst => !isDeletedInstitution(inst));
  });

  useEffect(() => {
    localStorage.setItem("correio_digital_institutions", JSON.stringify(institutions));
  }, [institutions]);

  useEffect(() => {
    const handleStorage = (e: StorageEvent | CustomEvent) => {
      const saved = localStorage.getItem("correio_digital_institutions");
      if (saved !== null) {
        try {
          const parsed = JSON.parse(saved) as Institution[];
          if (Array.isArray(parsed)) {
            setInstitutions(parsed.filter(inst => !isDeletedInstitution(inst)));
            return;
          }
        } catch { /* ignora */ }
      }
      setInstitutions(prev => prev.filter(inst => !isDeletedInstitution(inst)));
    };

    window.addEventListener('storage', handleStorage as EventListener);
    window.addEventListener('cda_registos_alterados', handleStorage as EventListener);
    return () => {
      window.removeEventListener('storage', handleStorage as EventListener);
      window.removeEventListener('cda_registos_alterados', handleStorage as EventListener);
    };
  }, []);

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
