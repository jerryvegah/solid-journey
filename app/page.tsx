"use client";

import { ArrowDownRight, ArrowRight, ArrowUpRight, Heart, Menu, Search, ShoppingBag, Star, X } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

type Piece = { name: string; type: string; price: string; image: string; color: string; note: string };
const pieces: Piece[] = [
  { name: "Orbit Hoops", type: "Earrings", price: "$128", image: "https://images.unsplash.com/photo-1630019852942-f89202989a59?auto=format&fit=crop&w=900&q=85", color: "Cobalt", note: "01 / 04" },
  { name: "Sculpture No. 3", type: "Rings", price: "$240", image: "https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=900&q=85", color: "Tangerine", note: "02 / 04" },
  { name: "Solaris Chain", type: "Necklaces", price: "$210", image: "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=900&q=85", color: "Lemon", note: "03 / 04" },
  { name: "Linea Cuff", type: "Bracelets", price: "$154", image: "https://images.unsplash.com/photo-1611652022419-a9419f74343d?auto=format&fit=crop&w=900&q=85", color: "Coral", note: "04 / 04" },
];
const filters = ["All", "Earrings", "Rings", "Necklaces", "Bracelets"];

export default function Home() {
  const [filter, setFilter] = useState("All");
  const [menuOpen, setMenuOpen] = useState(false);
  const [bag, setBag] = useState(0);
  const [saved, setSaved] = useState<string[]>([]);
  const shown = filter === "All" ? pieces : pieces.filter((piece) => piece.type === filter);
  const toggleSaved = (name: string) => setSaved((current) => current.includes(name) ? current.filter((item) => item !== name) : [...current, name]);

  return (
    <main className="noor-shell">
      <header className="noor-header"><a className="noor-logo" href="#home">NOOR<span>/</span>STUDIO</a><nav className={menuOpen ? "noor-nav open" : "noor-nav"}><a href="#shop" onClick={() => setMenuOpen(false)}>Collection</a><a href="#manifesto" onClick={() => setMenuOpen(false)}>Manifesto</a><a href="#notes" onClick={() => setMenuOpen(false)}>Notes</a><a href="#contact" onClick={() => setMenuOpen(false)}>Contact</a></nav><div className="noor-tools"><button aria-label="Search"><Search size={20} /></button><button aria-label={`${bag} pieces in bag`} className="bag-icon"><ShoppingBag size={20} />{bag > 0 && <b>{bag}</b>}</button><button className="mobile-toggle" aria-label="Toggle navigation" onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X /> : <Menu />}</button></div></header>

      <section id="home" className="noor-hero"><div className="hero-panel hero-blue"><div className="hero-index">NOOR / 001</div><div className="hero-blue-copy"><p>Objects for<br />your <em>orbit.</em></p><a href="#shop" className="circle-link">Shop new arrivals <ArrowDownRight size={22} /></a></div><div className="hero-meta">Handmade in small runs<br />Accra / New York</div></div><div className="hero-panel hero-photo"><Image src="https://images.unsplash.com/photo-1617038220319-276d3cfab638?auto=format&fit=crop&w=1400&q=90" alt="Statement gold jewelry" fill priority sizes="(max-width: 700px) 100vw, 50vw" /><div className="photo-label">The solar series<br /><strong>SS / 26</strong></div></div></section>
      <div className="ticker"><span>WEAR YOUR WONDER</span><Star size={14} fill="currentColor" /><span>UNCOMMON BY DESIGN</span><Star size={14} fill="currentColor" /><span>WEAR YOUR WONDER</span><Star size={14} fill="currentColor" /><span>UNCOMMON BY DESIGN</span></div>

      <section id="shop" className="noor-shop"><div className="shop-head"><div><p className="kicker">The current collection</p><h1>New forms<br /><i>for old rituals.</i></h1></div><p className="shop-intro">Jewelry that does not whisper. Small-batch pieces with a little heat, a little edge, and a lot of soul.</p></div><div className="filter-row">{filters.map((item) => <button key={item} className={filter === item ? "selected" : ""} onClick={() => setFilter(item)}>{item}</button>)}<span className="result-count">{shown.length} pieces</span></div><div className="piece-grid">{shown.map((piece) => <article className="piece" key={piece.name}><div className={`piece-photo piece-${piece.color.toLowerCase()}`}><Image src={piece.image} alt={piece.name} fill sizes="(max-width: 700px) 50vw, 25vw" /><span>{piece.note}</span><button className={saved.includes(piece.name) ? "saved" : ""} aria-label={`Save ${piece.name}`} onClick={() => toggleSaved(piece.name)}><Heart size={18} fill={saved.includes(piece.name) ? "currentColor" : "none"} /></button><button className="add-piece" onClick={() => setBag(bag + 1)}>Add to bag <ArrowRight size={15} /></button></div><div className="piece-detail"><div><h2>{piece.name}</h2><p>{piece.type} / {piece.color}</p></div><strong>{piece.price}</strong></div></article>)}</div></section>

      <section id="manifesto" className="manifesto"><div className="manifesto-number">02</div><div className="manifesto-copy"><p className="kicker">Our manifesto</p><h2>More feeling.<br /><i>Less precious.</i></h2><p>NOOR is a celebration of the everyday extraordinary. We make tactile pieces that move with you, catch the light, and never ask permission to be noticed.</p><a href="#notes" className="arrow-link">Meet the studio <ArrowRight size={18} /></a></div><div className="manifesto-image"><Image src="https://images.unsplash.com/photo-1573408301185-9146fe634ad0?auto=format&fit=crop&w=1000&q=85" alt="Gold jewelry arranged on a bold blue surface" fill sizes="(max-width: 700px) 100vw, 45vw" /></div></section>

      <section id="notes" className="noor-notes"><div className="notes-title"><p className="kicker">Field notes</p><h2>Things we<br /><i>notice.</i></h2><span>03 / 03</span></div><div className="note-list"><article><span>01</span><div><p className="kicker">Process</p><h3>Why we make in small runs.</h3><a href="#contact">Read note <ArrowRight size={14} /></a></div></article><article><span>02</span><div><p className="kicker">Care</p><h3>The long life of a good object.</h3><a href="#contact">Read note <ArrowRight size={14} /></a></div></article><article><span>03</span><div><p className="kicker">Style</p><h3>Five minutes to a new mood.</h3><a href="#contact">Read note <ArrowRight size={14} /></a></div></article></div></section>

      <section id="contact" className="noor-contact"><div><p className="kicker">Come say hello</p><h2>Keep in<br /><i>touch.</i></h2></div><div className="contact-details"><p>Questions, collaborations, or just want to talk jewelry?</p><a href="mailto:jerryvegah639@gmail.com">jerryvegah639@gmail.com <ArrowUpRight size={17} /></a><a href="tel:673641763">+233 673641763 <ArrowUpRight size={17} /></a></div></section>
      <footer className="noor-footer"><a className="noor-logo" href="#home">NOOR<span>/</span>STUDIO</a><p>Objects for your orbit.</p><div><a href="#shop">Shop</a><a href="#manifesto">About</a><a href="#contact">Contact</a></div><small>© 2026 Noor Studio</small></footer>
    </main>
  );
}
