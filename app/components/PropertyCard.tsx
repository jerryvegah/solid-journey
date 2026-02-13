'use client';

import { Property } from '@/types';
import {
  Bath,
  Bed,
  Briefcase,
  Cpu,
  Maximize,
  ShieldCheck,
  Waves
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

// Map amenities to specific Lucide icons from your Data Structure
const amenityIcons: Record<string, React.ReactNode> = {
  'Smart Home': <Cpu size={16} />,
  'Gated Security': <ShieldCheck size={16} />,
  'Pool': <Waves size={16} />,
  'Home Office': <Briefcase size={16} />,
};

export default function PropertyCard({ property }: { property: Property }) {
  return (
    <Link href={`/listings/${property.id}`} className="group block">
      <div className="relative overflow-hidden bg-[#1C1C1C]">
        {/* IMAGE WITH ZOOM HOVER */}
        <div className="relative aspect-[4/5] overflow-hidden">
          {property.imageUrl ? (
            <Image
              src={property.imageUrl}
              alt={property.title}
              fill
              className="object-cover transition-transform duration-700 group-hover:scale-110 opacity-90 group-hover:opacity-100"
            />
          ) : (
            <div className="w-full h-full bg-[#1C1C1C] flex items-center justify-center text-[#D4AF37]/20">
              <Maximize size={48} />
            </div>
          )}

          {/* STATUS BADGE */}
          <div className="absolute top-6 left-0 bg-[#D4AF37] text-[#1C1C1C] px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em]">
            {property.status || 'Exclusive'}
          </div>

          {/* AMENITIES QUICK-VIEW HOVER */}
          <div className="absolute bottom-0 left-0 right-0 p-6 translate-y-full group-hover:translate-y-0 transition-transform duration-500 bg-gradient-to-t from-[#1C1C1C] to-transparent">
            <div className="flex gap-3 text-white">
              {property.amenities?.slice(0, 3).map((amenity: string) => (
                <div key={amenity} className="flex items-center gap-1.5 bg-white/10 backdrop-blur-md px-2 py-1 rounded-sm text-[10px] uppercase tracking-wider">
                  {amenityIcons[amenity]}
                  <span>{amenity}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CONTENT SECTION */}
        <div className="py-6 border-b border-gray-100 group-hover:border-[#D4AF37] transition-colors">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-2">
            <h3 className="text-base md:text-lg font-light text-[#1C1C1C] uppercase tracking-tighter leading-tight max-w-full md:max-w-[70%]">
              {property.title}
            </h3>
            <p className="text-[#D4AF37] font-medium tracking-tight mt-2 md:mt-0">
              ${property.price?.toLocaleString()}
            </p>
          </div>

          <p className="text-gray-400 text-xs uppercase tracking-widest mb-4">
            {property.location || 'Prime Location'}
          </p>

          {/* CORE SPECS */}
          <div className="flex flex-wrap items-center gap-4 text-[11px] font-bold text-[#1C1C1C]/60 uppercase tracking-widest">
            <div className="flex items-center gap-2">
              <Bed size={14} className="text-[#D4AF37]" />
              <span>{property.bedrooms ?? '0'} BD</span>
            </div>
            <div className="flex items-center gap-2">
              <Bath size={14} className="text-[#D4AF37]" />
              <span>{property.bathrooms ?? '0'} BA</span>
            </div>
            <div className="flex items-center gap-2">
              <Maximize size={14} className="text-[#D4AF37]" />
              <span>{property.sqft?.toLocaleString() ?? '0'} SQ FT</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}