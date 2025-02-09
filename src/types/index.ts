export interface Clinic {
  id: string;
  name: string;
  district: string;
  location: {
    latitude: number;
    longitude: number;
  };
  website: string;
  phone: string;
  workingHours: string;
  services: Service[];
}

export interface Service {
  id: string;
  name: {
    ru: string;
    uz: string;
  };
  price: number;
  description?: string;
}

export interface District {
  id: string;
  name: {
    ru: string;
    uz: string;
  };
}

export interface TranslationKeys {
  welcome: string;
  sendLocation: string;
  changeLanguage: string;
  help: string;
  selectDistrict: string;
  serviceNotFound: string;
  enterServiceName: string;
  catalog: string;
  nearest: string;
  cheapest: string;
  subscribeToDiscounts: string;
  unsubscribeFromDiscounts: string;
  subscriptionSuccess: string;
  unsubscriptionSuccess: string;
  shareLocation: string;
  locationNeeded: string;
  alreadySubscribed: string;
  adminPanel: string;
  adminPanelWelcome: string;
  notAuthorized: string;
  adminStats: string;
  adminBroadcast: string;
  adminClinicsList: string;
  enterBroadcastMessage: string;
  broadcastSent: string;
  selectClinic: string;
  totalUsers: string;
  activeUsers: string;
  subscribedUsers: string;
  back: string;
  languageChanged: string;
  clinicsList: string;
  noLocation: string;
  cheapestServices: string;
  addClinic: string;
  editClinic: string;
  deleteClinic: string;
  addService: string;
  enterClinicName: string;
  enterClinicPhone: string;
  selectClinicDistrict: string;
  enterClinicWebsite: string;
  enterClinicHours: string;
  shareClinicLocation: string;
  clinicAdded: string;
  clinicDeleted: string;
  clinicUpdated: string;
  confirmDelete: string;
  yes: string;
  no: string;
  manageClinic: string;
  clinicManagement: string;
  noWebsite: string;
  services: string;
  currency: string;
  enterServiceNameRu: string;
  enterServiceNameUz: string;
  enterServicePrice: string;
  invalidPrice: string;
  serviceAdded: string;
}

export interface Translations {
  ru: TranslationKeys;
  uz: TranslationKeys;
}

export interface UserSession {
  step: 'district' | 'service' | 'idle' | 'waiting_broadcast' | 'waiting_clinic_name' | 'waiting_clinic_phone' | 'waiting_clinic_district' | 'waiting_clinic_location' | 'waiting_clinic_website' | 'waiting_clinic_hours' | 'waiting_service_name_ru' | 'waiting_service_name_uz' | 'waiting_service_price';
  selectedDistrict?: string;
  language: 'ru' | 'uz';
  subscribedCategories: string[];
  lastLocation?: {
    latitude: number;
    longitude: number;
  };
  tempData?: {
    clinicId?: string;
    newClinic?: Partial<Clinic>;
    newService?: Partial<Service>;
  };
}