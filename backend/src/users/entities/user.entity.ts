// backend/src/users/entities/user.entity.ts
export enum Role {
  PATIENT = 'PATIENT',
  DOCTOR = 'DOCTOR',
  PHARMACY = 'PHARMACY',
  ADMIN = 'ADMIN',
}

export class User {
  id: string;
  name: string;
  email: string;
  phone: string;
  passwordHash: string;
  role: Role;
  createdAt: Date;
  updatedAt: Date;
}
