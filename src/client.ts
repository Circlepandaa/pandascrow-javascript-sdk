import { HttpClient, type ClientOptions } from './http';
import { Auth } from './resources/auth';
import { Bank } from './resources/bank';
import { Escrow } from './resources/escrow';
import { Invoices } from './resources/invoices';
import { Kyc } from './resources/kyc';
import { PaymentLinks } from './resources/paymentLinks';
import { Payouts } from './resources/payouts';
import { VirtualAccounts } from './resources/virtualAccounts';
import { Wallet } from './resources/wallet';

/**
 * Entry point for the Pandascrow v3 API.
 *
 *   import Pandascrow from 'pandascrow';
 *   const ps = new Pandascrow(process.env.PANDASCROW_API_KEY!);                     // sandbox
 *   const ps = new Pandascrow(process.env.PANDASCROW_API_KEY!, { sandbox: false }); // live
 *
 * Use it on your server only: the API key gives full access to your account.
 */
export class Pandascrow extends HttpClient {
  readonly auth: Auth;
  readonly escrow: Escrow;
  readonly wallet: Wallet;
  readonly bank: Bank;
  readonly payouts: Payouts;
  readonly virtualAccounts: VirtualAccounts;
  readonly invoices: Invoices;
  readonly paymentLinks: PaymentLinks;
  readonly kyc: Kyc;

  /**
   * @param apiKey Public key of your application (Dashboard → Developers), sent as the `Token` header.
   */
  constructor(apiKey: string, options: ClientOptions = {}) {
    super(apiKey, options);
    this.auth = new Auth(this);
    this.escrow = new Escrow(this);
    this.wallet = new Wallet(this);
    this.bank = new Bank(this);
    this.payouts = new Payouts(this);
    this.virtualAccounts = new VirtualAccounts(this);
    this.invoices = new Invoices(this);
    this.paymentLinks = new PaymentLinks(this);
    this.kyc = new Kyc(this);
  }
}
