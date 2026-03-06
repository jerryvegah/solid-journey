export type Currency = 'GHS' | 'XAF';

export const CURRENCY_CONFIG = {
    GHS: {
        symbol: 'GH₵',
        name: 'Ghana Cedi',
        rate: 1,
        country: 'Ghana'
    },
    XAF: {
        symbol: 'FCFA',
        name: 'CFA Franc',
        rate: 50,
        country: 'Cameroon'
    },
};

/**
 * Detect country and currency from a phone number string
 */
export const detectCountryFromPhone = (phone: string): { country: string, currency: Currency } => {
    const cleanPhone = phone.replace(/\s+/g, '').replace('+', '');

    // Ghana: +233, 02..., 05...
    if (cleanPhone.startsWith('233') || cleanPhone.startsWith('02') || cleanPhone.startsWith('05')) {
        return { country: 'Ghana', currency: 'GHS' };
    }

    // Cameroon: +237, 67..., 69...
    if (cleanPhone.startsWith('237') || cleanPhone.startsWith('67') || cleanPhone.startsWith('69')) {
        return { country: 'Cameroon', currency: 'XAF' };
    }

    // Default to Ghana if unknown
    return { country: 'Ghana', currency: 'GHS' };
};

/**
 * Format a price based on the selected currency
 * @param priceGHS - The price in Ghana Cedis (original base price)
 * @param currency - The target currency for display
 */
export const formatPrice = (priceGHS: number, currency: Currency = 'GHS') => {
    const config = CURRENCY_CONFIG[currency] || CURRENCY_CONFIG.GHS;
    const converted = priceGHS * config.rate;
    return `${config.symbol} ${converted.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
};

/**
 * Get converted numeric price
 */
export const getConvertedPrice = (priceGHS: number, currency: Currency = 'GHS') => {
    const config = CURRENCY_CONFIG[currency] || CURRENCY_CONFIG.GHS;
    return priceGHS * config.rate;
};
