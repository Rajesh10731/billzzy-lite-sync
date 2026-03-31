export interface Country {
    name: string;
    code: string;
    dialCode: string;
    flag: string;
}

export const countries: Country[] = [
    { name: 'India', code: 'IN', dialCode: '+91', flag: '🇮🇳' },
    { name: 'United States', code: 'US', dialCode: '+1', flag: '🇺🇸' },
    { name: 'United Kingdom', code: 'GB', dialCode: '+44', flag: '🇬🇧' },
    { name: 'Canada', code: 'CA', dialCode: '+1', flag: '🇨🇦' },
    { name: 'Australia', code: 'AU', dialCode: '+61', flag: '🇦🇺' },
    { name: 'Germany', code: 'DE', dialCode: '+49', flag: '🇩🇪' },
    { name: 'France', code: 'FR', dialCode: '+33', flag: '🇫🇷' },
    { name: 'Japan', code: 'JP', dialCode: '+81', flag: '🇯🇵' },
    { name: 'China', code: 'CN', dialCode: '+86', flag: '🇨🇳' },
    { name: 'Brazil', code: 'BR', dialCode: '+55', flag: '🇧🇷' },
    { name: 'South Africa', code: 'ZA', dialCode: '+27', flag: '🇿🇦' },
    { name: 'Russia', code: 'RU', dialCode: '+7', flag: '🇷🇺' },
    { name: 'United Arab Emirates', code: 'AE', dialCode: '+971', flag: '🇦🇪' },
    { name: 'Saudi Arabia', code: 'SA', dialCode: '+966', flag: '🇸🇦' },
    { name: 'Singapore', code: 'SG', dialCode: '+65', flag: '🇸🇬' },
    { name: 'Malaysia', code: 'MY', dialCode: '+60', flag: '🇲🇾' },
    { name: 'Indonesia', code: 'ID', dialCode: '+62', flag: '🇮🇩' },
    { name: 'Thailand', code: 'TH', dialCode: '+66', flag: '🇹🇭' },
    { name: 'Vietnam', code: 'VN', dialCode: '+84', flag: '🇻🇳' },
    { name: 'Philippines', code: 'PH', dialCode: '+63', flag: '🇵🇭' },
    { name: 'Sri Lanka', code: 'LK', dialCode: '+94', flag: '🇱🇰' },
    { name: 'Bangladesh', code: 'BD', dialCode: '+880', flag: '🇧🇩' },
    { name: 'Pakistan', code: 'PK', dialCode: '+92', flag: '🇵🇰' },
    { name: 'Nepal', code: 'NP', dialCode: '+977', flag: '🇳🇵' },
    { name: 'Italy', code: 'IT', dialCode: '+39', flag: '🇮🇹' },
    { name: 'Spain', code: 'ES', dialCode: '+34', flag: '🇪🇸' },
    { name: 'Netherlands', code: 'NL', dialCode: '+31', flag: '🇳🇱' },
    { name: 'Switzerland', code: 'CH', dialCode: '+41', flag: '🇨🇭' },
    { name: 'Sweden', code: 'SE', dialCode: '+46', flag: '🇸🇪' },
    { name: 'Norway', code: 'NO', dialCode: '+47', flag: '🇳🇴' },
    { name: 'Denmark', code: 'DK', dialCode: '+45', flag: '🇩🇰' },
    { name: 'Finland', code: 'FI', dialCode: '+358', flag: '🇫🇮' },
    { name: 'Ireland', code: 'IE', dialCode: '+353', flag: '🇮🇪' },
    { name: 'New Zealand', code: 'NZ', dialCode: '+64', flag: '🇳🇿' },
    { name: 'Mexico', code: 'MX', dialCode: '+52', flag: '🇲🇽' },
    { name: 'Argentina', code: 'AR', dialCode: '+54', flag: '🇦🇷' },
    { name: 'Chile', code: 'CL', dialCode: '+56', flag: '🇨🇱' },
    { name: 'Colombia', code: 'CO', dialCode: '+57', flag: '🇨🇴' },
    { name: 'Peru', code: 'PE', dialCode: '+51', flag: '🇵🇪' },
    { name: 'Egypt', code: 'EG', dialCode: '+20', flag: '🇪🇬' },
    { name: 'Nigeria', code: 'NG', dialCode: '+234', flag: '🇳🇬' },
    { name: 'Kenya', code: 'KE', dialCode: '+254', flag: '🇰🇪' },
    { name: 'Turkey', code: 'TR', dialCode: '+90', flag: '🇹🇷' },
    { name: 'Israel', code: 'IL', dialCode: '+972', flag: '🇮🇱' },
    { name: 'South Korea', code: 'KR', dialCode: '+82', flag: '🇰🇷' },
];

export function formatPhoneNumber(phone: string | undefined): string {
    if (!phone) return '-';

    // Clean the phone number (remove spaces, dashes, etc.)
    const cleaned = phone.replaceAll(/\D/g, '');

    // Try to find a matching dial code
    // Sort countries by dialCode length descending to match longest first (e.g., +880 before +8)
    const sortedCountries = [...countries].sort((a, b) => b.dialCode.length - a.dialCode.length);

    for (const country of sortedCountries) {
        const dialCodeDigits = country.dialCode.replaceAll(/\D/g, '');
        if (cleaned.startsWith(dialCodeDigits)) {
            const number = cleaned.slice(dialCodeDigits.length);
            return `${country.flag} ${country.dialCode} ${number}`;
        }
    }

    return phone; // Return as is if no match
}
