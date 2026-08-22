"use client";

import { ArrowRight, Check, Heart, Menu, Search, ShoppingBag, Sparkles, X } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

type Product = { name: string; category: string; price: string; image: string; tag?: string };

const products: Product[] = [
  { name: "Solitaire Pearl Drop", category: "Earrings", price: "$168", image: "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=900&q=85", tag: "Bestseller" },
  { name: "Luna Signet Ring", category: "Rings", price: "$220", image: "https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=900&q=85" },
  { name: "Mara Fine Chain", category: "Necklaces", price: "$195", image: "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=900&q=85", tag: "New in" },
  { name: "Celeste Cuff", category: "Bracelets", price: "$142", image: "https://images.unsplash.com/photo-1611652022419-a9419f74343d?auto=format&fit=crop&w=900&q=85" },
];
const categories = ["All pieces", "Rings", "Necklaces", "Earrings", "Bracelets"];

export default function Home() {
  const [activeCategory, setActiveCategory] = useState("All pieces");
  const [cartCount, setCartCount] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [liked, setLiked] = useState<string[]>([]);
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const visibleProducts = activeCategory === "All pieces" ? products : products.filter((product) => product.category === activeCategory);
  const toggleLike = (name: string) => setLiked((current) => current.includes(name) ? current.filter((item) => item !== name) : [...current, name]);

  return (
    <main className="site-shell">
      <div className="announcement">Complimentary shipping on orders over $150 <ArrowRight size={14} /></div>
      <header className="site-header">
        <a className="wordmark" href="#top" aria-label="Lustre home">Lustre<span>.</span></a>
        <nav className={menuOpen ? "main-nav is-open" : "main-nav"} aria-label="Main navigation">
          <a href="#shop" onClick={() => setMenuOpen(false)}>Shop</a><a href="#story" onClick={() => setMenuOpen(false)}>Our story</a><a href="#journal" onClick={() => setMenuOpen(false)}>Journal</a><a href="#contact" onClick={() => setMenuOpen(false)}>Contact</a>
        </nav>
        <div className="header-actions"><button className="icon-button" aria-label="Search"><Search size={19} strokeWidth={1.7} /></button><button className="icon-button bag-button" aria-label={`${cartCount} items in bag`}><ShoppingBag size={19} strokeWidth={1.7} />{cartCount > 0 && <span>{cartCount}</span>}</button><button className="menu-button" aria-label="Toggle menu" onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X size={22} /> : <Menu size={22} />}</button></div>
      </header>

      <section id="top" className="hero"><div className="hero-copy"><p className="eyebrow"><Sparkles size={15} /> Everyday, elevated</p><h1>Jewelry with<br /><em>a point of view.</em></h1><p className="hero-intro">Thoughtful pieces for the stories you are still writing. Designed in New York, made to be worn everywhere.</p><a className="button button-dark" href="#shop">Explore the collection <ArrowRight size={16} /></a><div className="hero-note"><span>01</span><div><strong>Made to last</strong><br />Recycled 14k gold &amp; traceable stones</div></div></div><div className="hero-image-wrap"><Image className="hero-image" src="https://images.unsplash.com/photo-1617038220319-276d3cfab638?auto=format&fit=crop&w=1400&q=90" alt="Gold necklace and rings styled on a hand" fill priority sizes="(max-width: 800px) 100vw, 52vw" /><div className="hero-stamp">L / 2026<br /><span>Fine jewelry</span></div></div></section>
      <section className="marquee" aria-label="Lustre values"><span>DESIGNED WITH INTENTION</span><i>✦</i><span>MADE FOR EVERY DAY</span><i>✦</i><span>DESIGNED WITH INTENTION</span><i>✦</i></section>

      <section id="shop" className="collection section-pad"><div className="section-heading"><div><p className="eyebrow">The edit</p><h2>Pieces to keep.</h2></div><a href="#shop" className="text-link">View all pieces <ArrowRight size={15} /></a></div><div className="category-tabs" role="tablist" aria-label="Product categories">{categories.map((category) => <button key={category} className={activeCategory === category ? "active" : ""} onClick={() => setActiveCategory(category)}>{category}</button>)}</div><div className="product-grid">{visibleProducts.map((product) => <article className="product-card" key={product.name}><div className="product-image-wrap"><Image src={product.image} alt={product.name} fill sizes="(max-width: 700px) 50vw, 25vw" />{product.tag && <span className="product-tag">{product.tag}</span>}<button className={liked.includes(product.name) ? "like-button liked" : "like-button"} aria-label={`Save ${product.name}`} onClick={() => toggleLike(product.name)}><Heart size={17} fill={liked.includes(product.name) ? "currentColor" : "none"} /></button><button className="quick-add" onClick={() => setCartCount(cartCount + 1)}>Add to bag <ArrowRight size={14} /></button></div><div className="product-info"><div><h3>{product.name}</h3><p>{product.category}</p></div><strong>{product.price}</strong></div></article>)}</div></section>

      <section id="story" className="story section-pad"><div className="story-image"><Image src="https://images.unsplash.com/photo-1611652022419-a9419f74343d?auto=format&fit=crop&w=1100&q=85" alt="Gold bracelet in warm light" fill sizes="(max-width: 800px) 100vw, 48vw" /></div><div className="story-copy"><p className="eyebrow">A little more meaning</p><h2>Good jewelry<br /><em>gets personal.</em></h2><p>We believe the best pieces become part of your language. Lustre is made in small batches with considered materials, quiet details, and enough character to feel like yours.</p><a className="text-link" href="#journal">Read our story <ArrowRight size={15} /></a><div className="promise-list"><div><Check size={16} /><span>Ethically sourced materials</span></div><div><Check size={16} /><span>Lifetime care included</span></div></div></div></section>
      <section id="journal" className="journal section-pad"><div className="section-heading"><div><p className="eyebrow">From the journal</p><h2>Notes on adornment.</h2></div><a className="text-link" href="#journal">Read all <ArrowRight size={15} /></a></div><div className="journal-grid"><article><div className="journal-image"><Image src="https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=900&q=85" alt="Layered gold necklaces" fill sizes="33vw" /></div><p className="eyebrow">Style notes / 01</p><h3>The art of layering, made easy.</h3></article><article><div className="journal-image"><Image src="https://images.unsplash.com/photo-1603561596112-db7f5f5e05e8?auto=format&fit=crop&w=900&q=85" alt="Pearl jewelry detail" fill sizes="33vw" /></div><p className="eyebrow">Materials / 02</p><h3>Why we choose recycled gold.</h3></article><article className="journal-aside"><p className="eyebrow">A note from Lustre</p><blockquote>“The things we wear should meet us where we are, and stay for where we are going.”</blockquote><span>— Mira, founder</span></article></div></section>
      <section id="contact" className="newsletter"><div><p className="eyebrow">Stay in the loop</p><h2>Good things,<br /><em>occasionally.</em></h2></div><div className="newsletter-form">{subscribed ? <p className="success"><Check size={17} /> You are on the list. Welcome to Lustre.</p> : <><p>New releases, thoughtful notes, and a little sparkle in your inbox.</p><form onSubmit={(event) => { event.preventDefault(); if (email) setSubscribed(true); }}><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Your email address" aria-label="Your email address" required /><button aria-label="Subscribe"><ArrowRight size={19} /></button></form></>}</div></section>
      <footer className="site-footer"><a className="wordmark" href="#top">Lustre<span>.</span></a><p>Jewelry for your becoming.</p><div><a href="#shop">Shop</a><a href="#story">About</a><a href="tel:673641763">673641763</a><a href="mailto:jerryvegah639@gmail.com">jerryvegah639@gmail.com</a></div><small>© 2026 Lustre Jewelry Co.</small></footer>
    </main>
  );
}
