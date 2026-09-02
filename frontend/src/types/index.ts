export interface User {
  id: string;
  email: string;
  name: string;
  role: 'VIEWER' | 'ANALYST' | 'INVESTIGATOR' | 'ADMIN';
  status: string;
}

export interface Case {
  id: string;
  caseId: string;
  title: string;
  description?: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'UNDER_REVIEW' | 'CLOSED';
  classification: string;
  category?: string;
  assignedInvestigator?: string;
  createdAt: string;
  entityCount?: number;
  documentCount?: number;
}

export interface Entity {
  id: string;
  name: string;
  type: 'PERSON' | 'PHONE' | 'VEHICLE' | 'LOCATION' | 'ORGANIZATION' | 'BANK_ACCOUNT';
  riskScore: number;
  value?: string;
  aliases?: string;
}

export interface BlockchainRecord {
  id: string;
  index: number;
  timestamp: string;
  dataHash: string;
  previousHash: string;
  hash: string;
  action: string;
  note?: string;
}
