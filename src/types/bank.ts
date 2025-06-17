export interface Bank {
  ufi: number;
  bankName: string;
  ifscCode: string;
  branchName: string;
  address: string;
  updateAddress?: string;
  updatedBranchName?: string;
  userName?: string;
  phoneNumber?: string;
  response?: 'address_change' | 'name_change' | 'name_and_address_change';
  remarks?: string;
  id: number;
}

export interface BankResponse {
  banks: Bank[];
} 