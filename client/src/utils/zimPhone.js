// client/src/utils/zimPhone.js
// Zimbabwe mobile money numbers: accepts 0771234567, 771234567, +263 77 123 4567, 263-77-123-4567

const PREFIX_PROVIDERS = {
    '77': 'ecocash',
    '78': 'ecocash',
    '71': 'onemoney',
};

export const PROVIDER_LABELS = {
    ecocash: 'EcoCash',
    onemoney: 'OneMoney',
};

// Returns { local: '0771234567' | null, provider: 'ecocash' | 'onemoney' | null, error: string | null }
// error is null while the number is still being typed and looks plausible.
export function parseZimMobile(input, { final = false } = {}) {
    const raw = (input || '').trim();
    if (!raw) {
        return { local: null, provider: null, error: final ? 'Enter your mobile money number.' : null };
    }

    if (/[^\d\s+\-()]/.test(raw)) {
        return { local: null, provider: null, error: 'Use digits only, e.g. 0771234567.' };
    }

    let digits = raw.replace(/\D/g, '');
    // Still typing the +263 country code
    if (!final && digits.length < 3 && '263'.startsWith(digits)) {
        return { local: null, provider: null, error: null };
    }
    if (digits.startsWith('263')) digits = digits.slice(3);
    if (digits.startsWith('0')) digits = digits.slice(1);

    // digits should now be 9 long: 7X XXX XXXX
    if (digits.length > 0 && digits[0] !== '7') {
        return { local: null, provider: null, error: 'Zimbabwe mobile numbers start with 07, e.g. 0771234567.' };
    }

    const prefix = digits.slice(0, 2);
    const provider = PREFIX_PROVIDERS[prefix] || null;

    if (digits.length >= 2 && !provider) {
        return { local: null, provider: null, error: '07' + prefix.slice(1) + ' numbers are not supported. Use an EcoCash (077/078) or OneMoney (071) number.' };
    }

    if (digits.length > 9) {
        return { local: null, provider, error: 'That number has too many digits.' };
    }

    if (digits.length < 9) {
        return { local: null, provider, error: final ? 'That number is too short. It should have 10 digits, e.g. 0771234567.' : null };
    }

    return { local: `0${digits}`, provider, error: null };
}
