import React from 'react';
import { Facebook, Instagram, Twitter, Mail } from 'lucide-react';

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-white/5 bg-black/40 text-center mt-auto">
      <div className="max-w-screen-2xl mx-auto px-8 py-12 md:py-20">
        <div className="flex flex-col items-center justify-center gap-8 mb-10">
          <div className="select-none group cursor-pointer transition-transform duration-300 active:scale-95">
            <img 
              src="/logo-blanco.svg" 
              alt="Control2Dance Logo" 
              className="h-8 md:h-10 w-auto object-contain"
            />
          </div>
          
          <div className="flex gap-6">
            <a href="#" className="text-zinc-500 hover:text-white transition-colors">
              <Facebook className="w-5 h-5" />
            </a>
            <a href="#" className="text-zinc-500 hover:text-white transition-colors">
              <Instagram className="w-5 h-5" />
            </a>
            <a href="#" className="text-zinc-500 hover:text-white transition-colors">
              <Twitter className="w-5 h-5" />
            </a>
            <a href="mailto:info@control2dance.com" className="text-zinc-500 hover:text-white transition-colors">
              <Mail className="w-5 h-5" />
            </a>
          </div>

          <div className="flex flex-wrap justify-center gap-x-8 gap-y-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
            <a href="#" className="hover:text-white transition-colors">Términos y Condiciones</a>
            <a href="#" className="hover:text-white transition-colors">Política de Privacidad</a>
            <a href="#" className="hover:text-white transition-colors">Contacto</a>
            <a href="#" className="hover:text-white transition-colors">Sobre Nosotros</a>
          </div>
        </div>

        <p className="text-zinc-800 text-[8px] font-black uppercase tracking-[0.8em]">
          Professional Audio Restoration Unit • Control2Dance • {year}
        </p>
      </div>
    </footer>
  );
}
