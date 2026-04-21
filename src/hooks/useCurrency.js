import { useState, useEffect } from 'react';

export const CURRENCIES = {
  USD: { symbol: '$',   name: 'US Dollar',        flag: '🇺🇸' },
  EUR: { symbol: '€',   name: 'Euro',              flag: '🇪🇺' },
  GBP: { symbol: '£',   name: 'British Pound',     flag: '🇬🇧' },
  INR: { symbol: '₹',   name: 'Indian Rupee',      flag: '🇮🇳' },
  JPY: { symbol: '¥',   name: 'Japanese Yen',      flag: '🇯🇵' },
  CAD: { symbol: 'C$',  name: 'Canadian Dollar',   flag: '🇨🇦' },
  AUD: { symbol: 'A$',  name: 'Australian Dollar', flag: '🇦🇺' },
  SGD: { symbol: 'S$',  name: 'Singapore Dollar',  flag: '🇸🇬' },
};

const FALLBACK = { USD:1, EUR:0.92, GBP:0.79, INR:83.5, JPY:149.5, CAD:1.36, AUD:1.53, SGD:1.34 };

export function useCurrency() {
  const [currency, setCurrencyState] = useState(() => localStorage.getItem('mc_currency') || 'USD');
  const [rates, setRates]   = useState(FALLBACK);

  useEffect(() => {
    fetch('https://open.er-api.com/v6/latest/USD')
      .then(r => r.json())
      .then(d => { if (d.rates) setRates(d.rates); })
      .catch(() => {});
  }, []);

  const setCurrency = (c) => { localStorage.setItem('mc_currency', c); setCurrencyState(c); };
  const toUSD  = (amount) => amount / (rates[currency] || 1);
  const toDisp = (usd)    => usd * (rates[currency] || 1);
  const fmt    = (usd) => {
    const val = toDisp(usd);
    const sym = CURRENCIES[currency]?.symbol || currency;
    const dec = ['JPY','KRW'].includes(currency) ? 0 : 2;
    return sym + val.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec });
  };

  return { currency, setCurrency, rates, toUSD, toDisp, fmt };
}
