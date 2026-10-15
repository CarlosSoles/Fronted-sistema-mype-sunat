export interface LoginCredentials {
  email: string;
  password: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'ACCOUNTANT' | 'OPERATOR';
}

export interface CompanyTenant {
  tenantId: string;
  ruc: string;
  razonSocial: string;
  regimen: 'MYPE_TRIBUTARIO' | 'GENERAL' | 'ESPECIAL' | 'RUS';
}

export interface AuthResponse {
  token: string;
  user: UserProfile;
  companies: CompanyTenant[];
}
