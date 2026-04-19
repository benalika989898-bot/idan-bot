import { User } from './auth';

export interface CustomerProfile extends User {
  phone: string;
  full_name: string;
}
