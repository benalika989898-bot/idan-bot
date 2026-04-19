export const normalizePhoneForWhatsApp = (value?: string | null) => {
  if (!value) return null;
  const digits = value.replace(/\D/g, '');
  if (!digits) return null;
  if (digits.startsWith('972')) return digits;
  if (digits.startsWith('0')) return `972${digits.slice(1)}`;
  return digits;
};

export const normalizePhoneForCall = (value?: string | null) => {
  if (!value) return null;
  const digits = value.replace(/\D/g, '');
  return digits || null;
};

export const formatPhoneNumber = (phoneNumber: string) => {
  if (!phoneNumber) return '';
  // Remove non-digits
  let cleaned = phoneNumber.replace(/\D/g, '');

  // Convert 972... to 0...
  if (cleaned.startsWith('972')) {
    cleaned = '0' + cleaned.substring(3);
  }

  // Format 0526072080 -> 052-607-2080
  const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
  if (match) {
    return `${match[1]}-${match[2]}-${match[3]}`;
  }
  return phoneNumber;
};
