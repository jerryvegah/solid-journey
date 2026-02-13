"use client";

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';

// --- Type Definitions ---
type TranslationKeys = {
  [key: string]: string;
};

const translations: Record<string, TranslationKeys> = {
  en: {
    nav_how: "How It Works",
    nav_packages: "Input Packages",
    nav_signin: "Sign In",
    hero_title: "Grow crops Smarter, Not Harder",
    hero_subtitle: "Remotely map your farm, get instant climate assessments, and access tailored input packages with flexible financing options.",
    hero_cta_primary: "Get Started",
    hero_cta_secondary: "How It Works",
    audience_title: "Who We Serve",
    audience_farmers_title: "For Farmers & Cooperatives",
    audience_farmers_desc: "Unlock capital, improve yields, and access premium markets",
    audience_farmers_desc2: "with our AI-powered data tools and Localized climate reports",
    audience_investors_title: "For Investors & Partners",
    audience_investors_desc: "De-risk your investments and drive measurable impact",
    audience_investors_desc2: "with data-driven strategies and transparent climate reporting",
    how_title: "How Agricheck Works",
    step1_title: "Sign up & verify",
    step1_desc: "Register with your name, phone, and email to create your digital farmer presence.",
    step2_title: "Remotely map your farm",
    step2_desc: "Use your phone to draw your farm boundary. Our system analyzes your Farmland.",
    step3_title: "Assessment & Recommendation",
    step3_desc: "We use climate data, AI and satellite data to recommend the best input package for your crop and location.",
    step4_title: "Get Financing Offer",
    step4_desc: "Your farm's risk score determines your financing: Buy Now Pay Later with produce, Partial Deposit, or Cash.",
    step5_title: "Sign Contract & Receive Inputs",
    step5_desc: "Sign digitally, and we deliver your seeds, fertilizers, and chemicals to your location.",
    step6_title: "Monitor & Sell",
    step6_desc: "Monitor your farm throughout the season and sell your harvest directly to Agricheck if you choose.",
    packages_title: "Input Packages",
    package1_title: "Maize Starter Pack",
    package1_desc: "Includes hybrid maize seeds, NPK fertilizer, and pre-emergence herbicide.",
    package2_title: "Rice Grower Pack",
    package2_desc: "Certified seed, urea, and post-emergence fertilizer for optimal yields.",
    package3_title: "Soybean Booster Pack",
    package3_desc: "Improved seed variety, inoculant, and foliar fertilizer mix.",
    packages_cta: "Get Inputs",
    cta_title: "Buy Your Inputs and Farm with a Sure Market",
    cta_desc: "Get your digital farmer presence, map your farm, and see your tailored package and financing offer.",
    cta_button: "Get Started",
    footer_rights: "All rights reserved.",
    footer_privacy: "Privacy Policy",
    footer_terms: "Terms of Service",
    cookie_title: "We use cookies",
    cookie_desc: "We use cookies to improve your experience. By continuing, you agree.",
    cookie_decline: "Decline",
    cookie_accept: "Accept",
    testimonials_title: "What Our Farmers Say",
    testi1_text: "Agricheck transformed the way I farm. The financing and inputs came right on time.",
    testi1_author: "John K., Maize Farmer",
    testi2_text: "Satellite mapping helped me understand my land's potential. Highly recommended!",
    testi2_author: "Mary L., Rice Farmer",
    video_title: "See Agricheck in Action",
    video_desc: "Discover how we are revolutionizing agriculture with technology."
  },
  fr: {
    nav_how: "Comment ça marche",
    nav_packages: "Forfaits d'intrants",
    nav_signin: "Se connecter",
    hero_title: "Cultivez plus intelligemment",
    hero_subtitle: "Cartographiez votre ferme à distance et obtenez des évaluations climatiques.",
    hero_cta_primary: "Commencer",
    hero_cta_secondary: "Comment ça marche",
    audience_title: "Qui nous servons",
    audience_farmers_title: "Agriculteurs & Coopératives",
    audience_farmers_desc: "Débloquez des capitaux et améliorez les rendements",
    audience_farmers_desc2: "avec nos outils de données et rapports climatiques",
    audience_investors_title: "Investisseurs & Partenaires",
    audience_investors_desc: "Réduisez les risques et générez de l'impact",
    audience_investors_desc2: "avec des rapports climatiques transparents",
    how_title: "Comment fonctionne Agricheck",
    step1_title: "S'inscrire",
    step1_desc: "Inscrivez-vous avec votre nom et téléphone.",
    step2_title: "Cartographier",
    step2_desc: "Utilisez votre téléphone pour dessiner votre ferme.",
    step3_title: "Évaluation",
    step3_desc: "Nous recommandons le meilleur forfait d'intrants.",
    step4_title: "Offre de financement",
    step4_desc: "Le score de risque détermine votre financement.",
    step5_title: "Recevoir les intrants",
    step5_desc: "Livraison de semences et d'engrais.",
    step6_title: "Surveiller & Vendre",
    step6_desc: "Surveillez votre ferme et vendez votre récolte.",
    packages_title: "Forfaits d'intrants",
    package1_title: "Pack Maïs",
    package1_desc: "Semences hybrides et engrais NPK.",
    package2_title: "Pack Riz",
    package2_desc: "Semences certifiées et urée.",
    package3_title: "Pack Soja",
    package3_desc: "Variété améliorée et engrais foliaire.",
    packages_cta: "Obtenir",
    cta_title: "Vendez avec un marché sûr",
    cta_desc: "Présence numérique et cartographie de ferme.",
    cta_button: "Commencer",
    footer_rights: "Tous droits réservés.",
    footer_privacy: "Confidentialité",
    footer_terms: "Conditions",
    cookie_title: "Cookies",
    cookie_desc: "Nous utilisons des cookies pour améliorer votre expérience.",
    cookie_decline: "Refuser",
    cookie_accept: "Accepter",
    testimonials_title: "Ce que disent nos agriculteurs",
    testi1_text: "Agricheck a transformé ma façon de cultiver. Le financement et les intrants sont arrivés juste à temps.",
    testi1_author: "Jean K., Producteur de Maïs",
    testi2_text: "La cartographie par satellite m'a aidé à comprendre le potentiel de ma terre. Hautement recommandé !",
    testi2_author: "Marie L., Rizicultrice",
    video_title: "Voir Agricheck en Action",
    video_desc: "Découvrez comment nous révolutionnons l'agriculture grâce à la technologie."
  }
};

export default function LandingPage() {
  const [lang, setLang] = useState('en');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showCookies, setShowCookies] = useState(false);

  useEffect(() => {
    const savedLang = localStorage.getItem('preferredLanguage');
    if (savedLang && translations[savedLang]) setLang(savedLang);

    const consent = document.cookie.includes('cookieConsent=accepted');
    if (!consent) setShowCookies(true);
  }, []);

  const t = translations[lang];

  return (
    <main className="min-h-screen bg-white font-sans text-slate-900">
      {/* HEADER */}
      <header className="fixed top-0 w-full z-50 bg-white/95 backdrop-blur-sm shadow-md border-b border-emerald-100">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div className="relative w-32 h-12">
            <Image
              src="/Agriguard logo new s.png"
              alt="Agricheck"
              fill
              className="object-contain"
            />
          </div>

          <nav className={`fixed md:static top-0 ${isMenuOpen ? 'right-0' : '-right-full'} h-screen md:h-auto w-3/4 md:w-auto bg-white md:bg-transparent p-12 md:p-0 flex flex-col md:flex-row items-center gap-8 transition-all duration-300`}>
            <a href="#how" className="text-slate-700 hover:text-emerald-600 font-semibold" onClick={() => setIsMenuOpen(false)}>{t.nav_how}</a>
            <a href="#packages" className="text-slate-700 hover:text-emerald-600 font-semibold" onClick={() => setIsMenuOpen(false)}>{t.nav_packages}</a>
            <div className="flex gap-2 text-sm border-x px-4">
              <button onClick={() => setLang('en')} className={lang === 'en' ? 'text-emerald-600 font-bold' : 'text-slate-400'}>EN</button>
              <span className="text-slate-200">|</span>
              <button onClick={() => setLang('fr')} className={lang === 'fr' ? 'text-emerald-600 font-bold' : 'text-slate-400'}>FR</button>
            </div>
            <Link href="/signin" className="bg-emerald-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-emerald-700 transition-all shadow-lg active:scale-95">
              {t.nav_signin}
            </Link>
          </nav>

          <button className="md:hidden text-2xl" onClick={() => setIsMenuOpen(!isMenuOpen)}>
            <i className={`fa-solid ${isMenuOpen ? 'fa-xmark' : 'fa-bars'}`}></i>
          </button>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 bg-emerald-50/50">
        <div className="container mx-auto px-6 flex flex-col md:flex-row items-center gap-16 text-center md:text-left">
          <div className="flex-1 flex flex-col items-center md:items-start">
            <h1 className="text-5xl md:text-7xl font-bold text-emerald-900 leading-tight mb-6">
              {t.hero_title}
            </h1>
            <p className="text-lg md:text-xl text-slate-600 mb-10 max-w-xl">
              {t.hero_subtitle}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
              <Link href="/signup" className="bg-emerald-600 text-white px-8 py-4 rounded-xl font-bold text-lg hover:shadow-2xl hover:-translate-y-1 transition-all">
                {t.hero_cta_primary}
              </Link>
              <a href="#how" className="border-2 border-emerald-600 text-emerald-600 px-8 py-4 rounded-xl font-bold text-lg hover:bg-emerald-600 hover:text-white transition-all">
                {t.hero_cta_secondary}
              </a>
            </div>
          </div>
          <div className="flex-1 relative w-full h-[400px] rounded-3xl overflow-hidden shadow-2xl border-8 border-white">
            <Image
              src="/farm mapping.jpg"
              alt="Farm Mapping"
              fill
              className="object-cover"
              priority
            />
          </div>
        </div>
      </section>

      {/* AUDIENCE CARDS */}
      <section className="py-24 container mx-auto px-6">
        <h2 className="text-4xl font-bold text-center text-emerald-900 mb-16">{t.audience_title}</h2>
        <div className="grid md:grid-cols-2 gap-8">
          <div className="group relative h-[500px] rounded-3xl overflow-hidden shadow-xl">
            <Image src="/farm mapping.jpg" alt="Farmers" fill className="object-cover transition-transform group-hover:scale-110 duration-700" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent p-10 flex flex-col justify-end text-white">
              <h3 className="text-3xl font-bold mb-4">{t.audience_farmers_title}</h3>
              <p className="text-lg text-emerald-100 font-medium">
                <span className="text-emerald-400 font-bold">{t.audience_farmers_desc}</span> {t.audience_farmers_desc2}
              </p>
            </div>
          </div>
          <div className="group relative h-[500px] rounded-3xl overflow-hidden shadow-xl">
            <Image src="/farm mapping.jpg" alt="Investors" fill className="object-cover transition-transform group-hover:scale-110 duration-700" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent p-10 flex flex-col justify-end text-white">
              <h3 className="text-3xl font-bold mb-4">{t.audience_investors_title}</h3>
              <p className="text-lg text-emerald-100 font-medium">
                <span className="text-emerald-400 font-bold">{t.audience_investors_desc}</span> {t.audience_investors_desc2}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="py-24 bg-slate-50">
        <div className="container mx-auto px-6">
          <h2 className="text-4xl font-bold text-center text-emerald-900 mb-16">{t.how_title}</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[1, 2, 3, 4, 5, 6].map((num) => (
              <div key={num} className="bg-white p-8 rounded-3xl shadow-sm hover:shadow-xl transition-all border border-slate-100">
                <div className="w-12 h-12 bg-emerald-700 text-white rounded-2xl flex items-center justify-center text-xl font-bold mb-6 rotate-6 group-hover:rotate-0 transition-all">
                  {num}
                </div>
                <h3 className="text-xl font-bold text-emerald-800 mb-4">{t[`step${num}_title`]}</h3>
                <p className="text-slate-600 leading-relaxed">{t[`step${num}_desc`]}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* INPUT PACKAGES */}
      <section id="packages" className="py-24 bg-white">
        <div className="container mx-auto px-6">
          <h2 className="text-4xl font-bold text-center text-emerald-900 mb-16">{t.packages_title}</h2>
          <div className="grid md:grid-cols-3 gap-10">
            {[1, 2, 3].map((num) => (
              <div key={num} className="bg-white rounded-3xl overflow-hidden shadow-lg border border-slate-100 group">
                <div className="relative h-56 overflow-hidden">
                  <Image
                    src={num === 1 ? '/maizepack.jpg' : num === 2 ? '/ricepack.jpg' : '/soyabeanpack.jpg'}
                    alt="Package" fill className="object-cover group-hover:scale-105 transition-all duration-500"
                  />
                </div>
                <div className="p-8">
                  <h3 className="text-2xl font-bold text-emerald-900 mb-4">{t[`package${num}_title`]}</h3>
                  <p className="text-slate-600 mb-6">{t[`package${num}_desc`]}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS SECTION */}
      <section className="py-24 bg-emerald-50">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-4xl font-bold text-emerald-900 mb-16">{t.testimonials_title}</h2>
          <div className="grid md:grid-cols-2 gap-12 max-w-4xl mx-auto">
            <div className="bg-white p-10 rounded-3xl shadow-xl relative">
              <i className="fa-solid fa-quote-left text-4xl text-emerald-200 absolute top-8 left-8"></i>
              <p className="text-slate-600 text-lg italic mb-6 relative z-10">"{t.testi1_text}"</p>
              <h4 className="font-bold text-emerald-800">{t.testi1_author}</h4>
            </div>
            <div className="bg-white p-10 rounded-3xl shadow-xl relative">
              <i className="fa-solid fa-quote-left text-4xl text-emerald-200 absolute top-8 left-8"></i>
              <p className="text-slate-600 text-lg italic mb-6 relative z-10">"{t.testi2_text}"</p>
              <h4 className="font-bold text-emerald-800">{t.testi2_author}</h4>
            </div>
          </div>
        </div>
      </section>

      {/* VIDEO SECTION */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-4xl font-bold text-emerald-900 mb-6">{t.video_title}</h2>
          <p className="text-slate-600 mb-12 max-w-2xl mx-auto">{t.video_desc}</p>
          <div className="relative w-full max-w-4xl mx-auto aspect-video rounded-3xl overflow-hidden shadow-2xl border-4 border-emerald-100 bg-slate-900">
            {/* Placeholder for video - you can replace src with actual video URL or use an iframe */}
            <div className="absolute inset-0 flex items-center justify-center">
              <i className="fa-solid fa-play-circle text-8xl text-emerald-500/80 hover:text-emerald-500 cursor-pointer transition-all hover:scale-110"></i>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-slate-900 text-white py-12">
        <div className="container mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex flex-col md:flex-row items-center gap-6 text-center md:text-left">
            <div className="relative w-32 h-12">
              <Image src="/Agriguard logo new s.png" alt="Logo" fill className="object-contain" />
            </div>
            <p className="text-slate-400 text-sm leading-relaxed max-w-md">Agricheck helps Farmers, Cooperatives and investors make smarter agricultural decisions.</p>
          </div>

          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="text-center md:text-left">
              <h4 className="text-emerald-400 font-bold mb-2 tracking-widest uppercase text-xs">Support</h4>
              <a href="https://wa.me/message/..." className="text-slate-400 hover:text-white transition-all flex items-center justify-center md:justify-start gap-2">
                <i className="fa-brands fa-whatsapp"></i> WhatsApp Us
              </a>
            </div>
            <div className="flex gap-6 font-bold uppercase text-xs tracking-wider text-slate-500">
              <Link href="/privacy" className="hover:text-emerald-400 transition-colors">{t.footer_privacy}</Link>
              <Link href="/terms" className="hover:text-emerald-400 transition-colors">{t.footer_terms}</Link>
            </div>
          </div>
        </div>
        <div className="container mx-auto px-6 mt-8 pt-8 border-t border-slate-800 text-center text-slate-600 text-xs">
          <p>© 2026 Agricheck. {t.footer_rights}</p>
        </div>
      </footer>

      {/* COOKIES */}
      {showCookies && (
        <div className="fixed bottom-0 left-0 right-0 bg-emerald-900 text-white p-6 z-[1000] border-t-4 border-emerald-400">
          <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
            <p className="text-sm font-medium">{t.cookie_desc}</p>
            <div className="flex gap-4">
              <button onClick={() => setShowCookies(false)} className="px-6 py-2 border border-white/20 rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-white/10 transition-all">{t.cookie_decline}</button>
              <button onClick={() => { document.cookie = "cookieConsent=accepted; max-age=31536000"; setShowCookies(false); }} className="px-6 py-2 bg-emerald-500 rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-emerald-400 transition-all shadow-lg">{t.cookie_accept}</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}