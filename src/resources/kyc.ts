import type { ApiData } from '../http';
import { Resource } from './base';

/** Identity lookups. Each lookup is billed to the account that owns the API key. */
export class Kyc extends Resource {
  bvn(bvn: string): Promise<ApiData> {
    return this.http.get('/kyc/ng/lookup/bvn', { bvn });
  }

  nin(nin: string): Promise<ApiData> {
    return this.http.get('/kyc/ng/lookup/nin', { nin });
  }

  phone(phoneNumber: string): Promise<ApiData> {
    return this.http.get('/kyc/ng/lookup/phone', { phone_number: phoneNumber });
  }

  /** Account name for a NUBAN account number. */
  nuban(accountNumber: string, bankCode: string): Promise<ApiData> {
    return this.http.get('/kyc/ng/lookup/nuban', { account_number: accountNumber, bank_code: bankCode });
  }

  driversLicense(licenseNumber: string): Promise<ApiData> {
    return this.http.get('/kyc/ng/lookup/dl', { license_number: licenseNumber });
  }

  tin(tin: string): Promise<ApiData> {
    return this.http.get('/kyc/ng/lookup/tin', { tin });
  }

  /** CAC lookup by RC number. companyType e.g. BUSINESS_NAME, COMPANY, INCORPORATED_TRUSTEES. */
  cac(rcNumber: string, companyType?: string): Promise<ApiData> {
    return this.http.get('/kyc/ng/lookup/cac/rc', { rc_number: rcNumber, company_type: companyType });
  }

  /** CAC search by company name. */
  searchCac(searchTerm: string, searchType?: string): Promise<ApiData> {
    return this.http.get('/kyc/ng/lookup/cac/name', { searchTerm, searchType });
  }

  /** Email deliverability / risk check. */
  email(email: string): Promise<ApiData> {
    return this.http.get('/kyc/lookup/email', { email });
  }
}
