import { Currency, getConvertedPrice } from './currency';

// Define types for your configuration
interface CurrencyConfig {
    amount: string;
    paymentOptions: string;
    country: string;
}

const CONFIG = {
    publicKey: "FLWPUBK-3ef67085c05081c07f7de945fa0fa40c-X", // Live Key from your snippet
    currencies: {
        'GHS': { amount: '35', paymentOptions: 'card,mobilemoneyghana', country: 'Ghana' },
        'XAF': { amount: '1500', paymentOptions: 'card,mobilemoneyfranco', country: 'Cameroon' }
    }
};

export const initiateCheckout = (
    user: { email: string; name: string; uid: string },
    currency: Currency,
    amount: number | 'PREMIUM', // Can be a custom number or 'PREMIUM' to use default
    metadata: { title: string; description: string; logo?: string },
    onSuccess: (ref: string) => void
) => {
    const selected = CONFIG.currencies[currency];

    // Detemine actual amount
    const finalAmount = amount === 'PREMIUM' ? parseFloat(selected.amount) : getConvertedPrice(amount, currency);

    // @ts-ignore (Flutterwave is loaded via CDN)
    if (typeof window !== 'undefined' && (window as any).FlutterwaveCheckout) {
        (window as any).FlutterwaveCheckout({
            public_key: CONFIG.publicKey,
            tx_ref: `AGRI-${Date.now()}-${user.uid.slice(0, 5)}`,
            amount: finalAmount,
            currency: currency,
            payment_options: selected.paymentOptions,
            customer: {
                email: user.email,
                name: user.name,
            },
            customizations: {
                title: metadata.title,
                description: metadata.description,
                logo: metadata.logo || "https://agricheck.farm/favicon.png",
            },
            callback: (data: any) => {
                if (data.status === "successful") {
                    onSuccess(data.transaction_ref || data.flw_ref || `REF-${Date.now()}`);
                }
            },
            onclose: () => {
                console.log("Payment modal closed");
            }
        });
    } else {
        console.error("Flutterwave SDK not loaded yet.");
        alert("Payment system is still initializing. Please try again in a moment.");
    }
};
