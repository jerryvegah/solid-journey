"use client";

import Link from "next/link";
import { useState } from "react";

export default function Navigation() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <nav className="fixed w-full z-50 bg-white/90 backdrop-blur-md border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <Link href="/" className="text-2xl font-bold tracking-tighter uppercase text-[#1C1C1C]">WORTH REALTY</Link>

        <div className="hidden md:flex items-center space-x-8 text-sm font-semibold uppercase tracking-wider">
          <Link href="/listings" className="hover:text-[#D4AF37] transition">Listings</Link>
          <Link href="/about" className="hover:text-[#D4AF37] transition">About</Link>
          <Link href="/services" className="hover:text-[#D4AF37] transition">Services</Link>
          <Link href="/dashboard" className="hover:text-[#D4AF37] transition">Bookings</Link>
          <Link href="/contact" className="bg-[#D4AF37] text-[#1C1C1C] px-4 py-2 rounded-sm">Contact</Link>
        </div>

        <button className="md:hidden text-[#1C1C1C] text-2xl" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>☰</button>
      </div>

      {isMobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-gray-100">
          <div className="px-6 py-4 space-y-4 text-sm font-semibold uppercase tracking-widest">
            <Link href="/listings" className="block">Listings</Link>
            <Link href="/about" className="block">About</Link>
            <Link href="/services" className="block">Services</Link>
            <Link href="/dashboard" className="block">Bookings</Link>
            <Link href="/contact" className="block bg-[#D4AF37] text-[#1C1C1C] px-4 py-2 inline-block">Contact</Link>
          </div>
        </div>
      )}
    </nav>
  );
}