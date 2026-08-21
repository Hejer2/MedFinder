export const validateEmail = (email: string): boolean => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

export const checkPasswordStrength = (password: string): { score: number; label: string } => {
  let score = 0;
  if (password.length > 6) score += 1;
  if (password.length > 10) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  if (score < 2) return { score, label: 'Weak' };
  if (score < 4) return { score, label: 'Fair' };
  return { score, label: 'Strong' };
};
