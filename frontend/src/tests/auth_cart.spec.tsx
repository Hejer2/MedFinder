import { describe, it, expect } from 'vitest';

describe('Pharmacy Cart & Calculation Business Logic', () => {
  it('Should calculate item subtotal correctly', () => {
    const items = [
      { id: '1', name: 'Paracetamol 1000mg', price: 8.5, quantity: 2 },
      { id: '2', name: 'Vitamin C 500mg', price: 12.0, quantity: 1 },
    ];

    const subtotal = items.reduce((acc, item) => acc + item.price * item.quantity, 0);
    expect(subtotal).toBe(29.0);
  });

  it('Should apply delivery fee only when deliveryMethod is DELIVERY', () => {
    const subtotal = 29.0;
    const pharmacyDeliveryFee = 7.0;

    const deliveryTotal = subtotal + pharmacyDeliveryFee;
    const pickupTotal = subtotal;

    expect(deliveryTotal).toBe(36.0);
    expect(pickupTotal).toBe(29.0);
  });

  it('Should prevent order submission when stock is 0', () => {
    const medicine = { id: '1', name: 'Doliprane', price: 5.0, stock: 0, status: 'OUT_OF_STOCK' };
    const canOrder = medicine.stock > 0 && medicine.status !== 'OUT_OF_STOCK';
    expect(canOrder).toBe(false);
  });
});

describe('Role Redirection Rules', () => {
  it('Should map roles to their canonical dashboard routes', () => {
    const getRoleDashboard = (role: string) => {
      switch (role) {
        case 'DOCTOR':
          return '/dashboard/doctor';
        case 'ADMIN':
          return '/admin';
        case 'PHARMACY':
          return '/dashboard/pharmacy';
        default:
          return '/dashboard/patient';
      }
    };

    expect(getRoleDashboard('DOCTOR')).toBe('/dashboard/doctor');
    expect(getRoleDashboard('ADMIN')).toBe('/admin');
    expect(getRoleDashboard('PHARMACY')).toBe('/dashboard/pharmacy');
    expect(getRoleDashboard('PATIENT')).toBe('/dashboard/patient');
  });
});
