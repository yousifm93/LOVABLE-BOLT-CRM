import React, { createContext, useContext, useEffect, useReducer, ReactNode, useState } from 'react';
import { useForm, UseFormReturn } from 'react-hook-form';
import { supabase } from '@/integrations/supabase/client';
import { databaseService } from '@/services/database';

export interface CoBorrower {
  id: string;
  relationship: 'spouse' | 'family' | 'friend' | 'other';
  customRelationship?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

export interface EmploymentIncome {
  id: string;
  employmentType: string;
  isCurrentJob: boolean;
  isPrimaryIncome: boolean;
  employerName: string;
  position: string;
  startDate: string;
  monthlyIncome: string;
  workPhone: string;
  workPhoneExt: string;
  officeAddress: string;
  timeSpentYears: string;
  timeSpentMonths: string;
  incomeType: 'salary' | 'hourly';
  basePay: string;
  bonus: string;
  commissions: string;
  overtime: string;
  other: string;
  frequency: string;
  hourlyRate: string;
  averageHoursPerWeek: string;
  isSeasonalIncome: boolean;
  isForeignIncome: boolean;
  employedByFamilyMember: boolean;
}

export interface OtherIncome {
  id: string;
  type: string;
  amount: string;
}

export interface Asset {
  id: string;
  type: string;
  financialInstitution: string;
  accountNumber: string;
  balance: string;
}

export interface Property {
  id: string;
  address: string;
  propertyValue: string;
  propertyUsage: string;
  propertyStatus: string;
  propertyType: string;
  monthlyExpenses: string;
  monthlyRent?: string;
}

export interface Declaration {
  id: string;
  question: string;
  answer: boolean | null;
  details?: string;
  required?: boolean;
}

export interface DemographicsInfo {
  race: {
    americanIndianAlaskaNative: boolean;
    tribalAffiliation?: string;
    asian: boolean;
    asianSubcategories: string[];
    asianOther?: string;
    blackAfricanAmerican: boolean;
    nativeHawaiianPacificIslander: boolean;
    pacificIslanderSubcategories: string[];
    pacificIslanderOther?: string;
    white: boolean;
    doNotWishToProvide: boolean;
  };
  ethnicity: 'hispanic' | 'notHispanic' | 'doNotWish' | null;
  gender: 'male' | 'female' | 'doNotWish' | null;
}

export interface CreditInfo {
  dateOfBirth: string;
  age?: number;
  socialSecurityNumber: string;
  confirmSocialSecurityNumber: string;
  estimatedCreditScore: string;
}

export interface AdditionalQuestionsInfo {
  targetMonthlyPayment: string;
}

export interface ReviewSubmitInfo {
  authorizationToOrderCredit: boolean;
  electronicDisclosuresConsent: boolean;
  isSubmitted: boolean;
  submissionDate?: string;
}

export interface ApplicationData {
  loanPurpose: 'purchase' | 'refinance' | null;
  mortgageInfo: {
    purchaseStage: string;
    propertyType: string;
    occupancy: string;
    businessOperation: boolean;
    monthlyPayment: string;
    hasAgent: boolean;
    agentName: string;
    agentEmail: string;
    agentPhone: string;
    purchasePrice: string;
    downPaymentAmount: string;
    downPaymentPercent: string;
    targetLocation: {
      city: string;
      state: string;
      zipCode: string;
      countyName: string;
    };
    comfortableMonthlyPayment: string;
  };
  personalInfo: {
    firstName: string;
    middleName: string;
    lastName: string;
    suffix: string;
    hasAlternateNames: boolean;
    hasNickname: boolean;
    alternateDetails: string;
    email: string;
    cellPhone: string;
    workPhone: string;
    workPhoneExt: string;
    homePhone: string;
    consentToContact: boolean;
    currentAddress: {
      street: string;
      unit: string;
      city: string;
      state: string;
      zipCode: string;
    };
    mailingAddressSame: boolean;
    mailingAddress: string;
    propertyOwnership: string;
    yearsAtCurrentAddress: string;
    monthsAtCurrentAddress: string;
    isUSMilitary: boolean;
    residencyType: string;
    maritalStatus: string;
    dateOfBirth: string;
    estimatedCreditScore: string;
    hasDependents: boolean;
    dependentsCount: string;
  };
  coBorrowers: {
    applySolelyByMyself: boolean;
    coBorrowers: CoBorrower[];
  };
  income: {
    employmentIncomes: EmploymentIncome[];
    otherIncomes: OtherIncome[];
    totalMonthlyIncome: number;
  };
  assets: {
    hasNoAssets: boolean;
    assets: Asset[];
    totalAssets: number;
  };
  realEstate: {
    ownsRealEstate: boolean;
    properties: Property[];
  };
  declarations: Declaration[];
  demographics: DemographicsInfo;
  credit: CreditInfo;
  additionalQuestions: AdditionalQuestionsInfo;
  reviewSubmit: ReviewSubmitInfo;
  currentSection: number;
  visitedSections: Set<number>;
  completedFields: Set<string>;
}

interface ApplicationState {
  data: ApplicationData;
  isAutoSaving: boolean;
  hasUnsavedChanges: boolean;
  progressPercentage: number;
}

type ApplicationAction =
  | { type: 'SET_LOAN_PURPOSE'; payload: 'purchase' | 'refinance' }
  | { type: 'UPDATE_SECTION'; payload: { section: keyof ApplicationData; data: Partial<any> } }
  | { type: 'SET_CURRENT_SECTION'; payload: number }
  | { type: 'MARK_FIELD_COMPLETED'; payload: string }
  | { type: 'SET_AUTO_SAVING'; payload: boolean }
  | { type: 'SET_UNSAVED_CHANGES'; payload: boolean }
  | { type: 'LOAD_FROM_STORAGE'; payload: ApplicationData };

const initialData: ApplicationData = {
  loanPurpose: null,
  mortgageInfo: {
    purchaseStage: '',
    propertyType: '',
    occupancy: '',
    businessOperation: false,
    monthlyPayment: '',
    hasAgent: false,
    agentName: '',
    agentEmail: '',
    agentPhone: '',
    purchasePrice: '',
    downPaymentAmount: '',
    downPaymentPercent: '',
    targetLocation: {
      city: '',
      state: '',
      zipCode: '',
      countyName: '',
    },
    comfortableMonthlyPayment: '',
  },
  personalInfo: {
    firstName: '',
    middleName: '',
    lastName: '',
    suffix: '',
    hasAlternateNames: false,
    hasNickname: false,
    alternateDetails: '',
    email: '',
    cellPhone: '',
    workPhone: '',
    workPhoneExt: '',
    homePhone: '',
    consentToContact: false,
    currentAddress: {
      street: '',
      unit: '',
      city: '',
      state: '',
      zipCode: '',
    },
    mailingAddressSame: true,
    mailingAddress: '',
    propertyOwnership: '',
    yearsAtCurrentAddress: '',
    monthsAtCurrentAddress: '',
    isUSMilitary: false,
    residencyType: '',
    maritalStatus: '',
    dateOfBirth: '',
    estimatedCreditScore: '',
    hasDependents: false,
    dependentsCount: '',
  },
  coBorrowers: {
    applySolelyByMyself: false,
    coBorrowers: [],
  },
  income: {
    employmentIncomes: [],
    otherIncomes: [],
    totalMonthlyIncome: 0,
  },
  assets: {
    hasNoAssets: false,
    assets: [],
    totalAssets: 0,
  },
  realEstate: {
    ownsRealEstate: false,
    properties: [],
  },
  declarations: [
    { id: '1', question: 'Will you occupy the property as your primary residence?', answer: null, required: true },
    { id: '2', question: 'Have you had an ownership interest in another property in the last three years?', answer: null, required: true },
    { id: '3', question: 'If this is a Purchase Transaction: Do you have a family/business affiliation with the seller?', answer: null },
    { id: '4', question: 'Are you borrowing any money for this real estate transaction (e.g., closing costs, down payment) not disclosed elsewhere?', answer: null },
    { id: '5', question: 'Have you or will you apply for another mortgage loan on another property not disclosed here?', answer: null },
    { id: '6', question: 'Have you or will you apply for any new credit (installment loan, credit card, etc.) not disclosed here?', answer: null },
    { id: '7', question: 'Will this property be subject to a lien that could take priority over the mortgage?', answer: null },
    { id: '8', question: 'Are you a co-signer or guarantor on any debt/loan not disclosed here?', answer: null },
    { id: '9', question: 'Are there any outstanding judgements against you?', answer: null },
    { id: '10', question: 'Are you currently delinquent or in default on any federal debt?', answer: null },
    { id: '11', question: 'Are you a party to a lawsuit where you may owe money?', answer: null },
    { id: '12', question: 'Have you conveyed title to a property in lieu of foreclosure?', answer: null },
    { id: '13', question: 'Within the past 7 years, have you completed a short sale, deed-in-lieu, or similar?', answer: null },
    { id: '14', question: 'Have you had a foreclosure in the last 7 years?', answer: null },
    { id: '15', question: 'Have you declared bankruptcy in the last 7 years?', answer: null },
  ],
  demographics: {
    race: {
      americanIndianAlaskaNative: false,
      asian: false,
      asianSubcategories: [],
      blackAfricanAmerican: false,
      nativeHawaiianPacificIslander: false,
      pacificIslanderSubcategories: [],
      white: false,
      doNotWishToProvide: false,
    },
    ethnicity: null,
    gender: null,
  },
  credit: {
    dateOfBirth: '',
    socialSecurityNumber: '',
    confirmSocialSecurityNumber: '',
    estimatedCreditScore: '',
  },
  additionalQuestions: {
    targetMonthlyPayment: '',
  },
  reviewSubmit: {
    authorizationToOrderCredit: false,
    electronicDisclosuresConsent: false,
    isSubmitted: false,
  },
  currentSection: 1,
  visitedSections: new Set([1]),
  completedFields: new Set(),
};

const calculateProgress = (data: ApplicationData): number => {
  const requiredFields = [
    'mortgageInfo.propertyType',
    'mortgageInfo.occupancy',
    'mortgageInfo.comfortableMonthlyPayment',
    'mortgageInfo.purchasePrice',
    'personalInfo.firstName',
    'personalInfo.lastName',
    'personalInfo.email',
    'personalInfo.currentAddress.street',
    'personalInfo.yearsAtCurrentAddress',
    'personalInfo.monthsAtCurrentAddress',
    'personalInfo.consentToContact',
  ];

  const conditionalFields: string[] = [];

  if (data.coBorrowers && !data.coBorrowers.applySolelyByMyself && data.coBorrowers.coBorrowers?.length === 0) {
    conditionalFields.push('coBorrowers.required');
  }

  let totalEmploymentYears = 0;
  if (data.income && data.income.employmentIncomes) {
    totalEmploymentYears = data.income.employmentIncomes.reduce((total, income) => {
      const years = parseInt(income.timeSpentYears) || 0;
      const months = parseInt(income.timeSpentMonths) || 0;
      return total + years + (months / 12);
    }, 0);
    if (totalEmploymentYears < 2 || data.income.employmentIncomes.length === 0) {
      conditionalFields.push('income.required');
    }
  }

  if (data.assets && !data.assets.hasNoAssets && data.assets.assets?.length === 0) {
    conditionalFields.push('assets.required');
  }

  if (data.realEstate && data.realEstate.ownsRealEstate && data.realEstate.properties?.length === 0) {
    conditionalFields.push('realEstate.required');
  }

  const newSectionFields = [
    ...data.declarations.filter(d => d.required).map(d => `declarations.${d.id}`),
    'personalInfo.dateOfBirth',
    'personalInfo.estimatedCreditScore',
  ];

  const totalFields = requiredFields.length + conditionalFields.length + newSectionFields.length;

  const completedFields = requiredFields.filter(field => {
    const keys = field.split('.');
    let value: any = data;
    for (const key of keys) {
      value = value?.[key];
    }
    return value && value !== '' && value !== false;
  }).length;

  const conditionalCompleted = conditionalFields.length - conditionalFields.filter(field => {
    if (field === 'coBorrowers.required') {
      return data.coBorrowers && !data.coBorrowers.applySolelyByMyself && data.coBorrowers.coBorrowers?.length === 0;
    }
    if (field === 'income.required') {
      return totalEmploymentYears < 2 || (data.income && data.income.employmentIncomes?.length === 0);
    }
    if (field === 'assets.required') {
      return data.assets && !data.assets.hasNoAssets && data.assets.assets?.length === 0;
    }
    if (field === 'realEstate.required') {
      return data.realEstate && data.realEstate.ownsRealEstate && data.realEstate.properties?.length === 0;
    }
    return false;
  }).length;

  const newSectionCompleted = newSectionFields.filter(field => {
    if (field.startsWith('declarations.')) {
      const declId = field.split('.')[1];
      const declaration = data.declarations.find(d => d.id === declId);
      return declaration && declaration.answer !== null;
    }
    const keys = field.split('.');
    let value: any = data;
    for (const key of keys) {
      value = value?.[key];
    }
    return value && value !== '' && value !== false;
  }).length;

  return Math.round(((completedFields + conditionalCompleted + newSectionCompleted) / totalFields) * 100);
};

const applicationReducer = (state: ApplicationState, action: ApplicationAction): ApplicationState => {
  switch (action.type) {
    case 'SET_LOAN_PURPOSE':
      const newDataWithPurpose = { ...state.data, loanPurpose: action.payload };
      return {
        ...state,
        data: newDataWithPurpose,
        hasUnsavedChanges: true,
        progressPercentage: calculateProgress(newDataWithPurpose),
      };

    case 'UPDATE_SECTION':
      const updatedData = {
        ...state.data,
        [action.payload.section]: {
          ...(state.data[action.payload.section] as any),
          ...action.payload.data,
        },
      };
      return {
        ...state,
        data: updatedData,
        hasUnsavedChanges: true,
        progressPercentage: calculateProgress(updatedData),
      };

    case 'SET_CURRENT_SECTION':
      const visitedSections = new Set(state.data.visitedSections);
      visitedSections.add(action.payload);
      return {
        ...state,
        data: {
          ...state.data,
          currentSection: action.payload,
          visitedSections,
        },
      };

    case 'MARK_FIELD_COMPLETED':
      const completedFields = new Set(state.data.completedFields);
      completedFields.add(action.payload);
      return {
        ...state,
        data: {
          ...state.data,
          completedFields,
        },
      };

    case 'SET_AUTO_SAVING':
      return { ...state, isAutoSaving: action.payload };

    case 'SET_UNSAVED_CHANGES':
      return { ...state, hasUnsavedChanges: action.payload };

    case 'LOAD_FROM_STORAGE':
      return {
        ...state,
        data: action.payload,
        progressPercentage: calculateProgress(action.payload),
      };

    default:
      return state;
  }
};

interface ApplicationContextType {
  state: ApplicationState;
  data: ApplicationData;
  dispatch: React.Dispatch<ApplicationAction>;
  saveApplication: () => void;
  form: UseFormReturn<any>;
  progressPercentage: number;
}

const ApplicationContext = createContext<ApplicationContextType | null>(null);

export const useApplication = () => {
  const context = useContext(ApplicationContext);
  if (!context) {
    throw new Error('useApplication must be used within ApplicationProvider');
  }
  return context;
};

interface ApplicationProviderProps {
  children: ReactNode;
}

export const ApplicationProvider: React.FC<ApplicationProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(applicationReducer, {
    data: initialData,
    isAutoSaving: false,
    hasUnsavedChanges: false,
    progressPercentage: 0,
  });
  const [userId, setUserId] = useState<string | null>(null);

  const form = useForm({
    defaultValues: state.data,
    mode: 'onBlur',
  });

  // Listen for auth state changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state changed:', event, session?.user?.id);
      setUserId(session?.user?.id || null);
    });
    
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('Initial session:', session?.user?.id);
      setUserId(session?.user?.id || null);
    });
    
    return () => subscription.unsubscribe();
  }, []);

  // Load application when userId changes (including on login)
  useEffect(() => {
    if (userId) {
      loadSavedApplication(userId);
    }
  }, [userId]);

  const loadSavedApplication = async (userId: string) => {
    try {
      console.log('Loading application for user:', userId);
      
      // First, get user account data for auto-fill
      const { data: userData, error: userError } = await supabase
        .from('application_users')
        .select('first_name, last_name, email')
        .eq('id', userId)
        .single();

      if (userError) {
        console.error('Error fetching user data:', userError);
      } else {
        console.log('Fetched user data:', userData);
      }

      // Then load saved application
      const savedApp = await databaseService.loadApplication(userId);
      console.log('Loaded saved application:', savedApp);
      
      if (savedApp && savedApp.application_data) {
        // Load existing application data
        const parsedData = savedApp.application_data as any;
        const restoredData = {
          ...initialData,
          ...parsedData,
          visitedSections: new Set(parsedData.visitedSections || [1]),
          completedFields: new Set(parsedData.completedFields || []),
        };
        console.log('Restoring saved application data');
        dispatch({ type: 'LOAD_FROM_STORAGE', payload: restoredData });
        form.reset(restoredData);
      } else {
        // No saved application - auto-fill from account data
        if (userData) {
          const autoFilledData = {
            ...initialData,
            personalInfo: {
              ...initialData.personalInfo,
              firstName: userData.first_name || '',
              lastName: userData.last_name || '',
              email: userData.email || '',
            },
          };
          console.log('Auto-filling personal info from account data:', autoFilledData.personalInfo);
          dispatch({ type: 'LOAD_FROM_STORAGE', payload: autoFilledData });
          form.reset(autoFilledData);
        }
      }
    } catch (error) {
      console.error('Failed to load application data:', error);
    }
  };

  const saveApplication = async () => {
    dispatch({ type: 'SET_AUTO_SAVING', payload: true });
    try {
      const dataToSave = {
        ...state.data,
        visitedSections: Array.from(state.data.visitedSections),
        completedFields: Array.from(state.data.completedFields),
        progressPercentage: state.progressPercentage,
      };
      
      // Check if user is authenticated
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        console.log('Saving application for user:', session.user.id);
        const result = await databaseService.saveApplication(session.user.id, dataToSave);
        console.log('Application saved successfully:', result);
      } else {
        console.log('No session, saving to localStorage');
        localStorage.setItem('mortgageApplication', JSON.stringify(dataToSave));
      }
      
      dispatch({ type: 'SET_UNSAVED_CHANGES', payload: false });
    } catch (error) {
      console.error('Failed to save application:', error);
    } finally {
      dispatch({ type: 'SET_AUTO_SAVING', payload: false });
    }
  };

  useEffect(() => {
    if (state.hasUnsavedChanges) {
      const timer = setTimeout(saveApplication, 1000);
      return () => clearTimeout(timer);
    }
  }, [state.hasUnsavedChanges]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (state.hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [state.hasUnsavedChanges]);

  return (
    <ApplicationContext.Provider value={{ state, data: state.data, dispatch, saveApplication, form, progressPercentage: state.progressPercentage }}>
      {children}
    </ApplicationContext.Provider>
  );
};
