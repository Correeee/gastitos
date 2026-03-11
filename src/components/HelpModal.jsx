import React from 'react';
import { HelpCircle, X } from 'lucide-react';
import { Button } from './Button';

export const HelpModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem' }} onClick={onClose}>
      <div className="custom-scrollbar" style={{ backgroundColor: '#ffffff', padding: '2rem', borderRadius: '16px', maxWidth: '500px', width: '100%', maxHeight: '90vh', overflowY: 'auto', position: 'relative', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', cursor: 'default' }} onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', cursor: 'pointer', color: '#666', padding: '0.5rem' }}>
          <X size={20} />
        </button>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#111' }}>
          <HelpCircle style={{ color: '#ff4d4f' }} /> ¿Cómo funciona Gastitos?
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', fontSize: '0.95rem', color: '#444', lineHeight: 1.5 }}>
          <div>
            <strong style={{ display: 'block', color: '#111', marginBottom: '0.25rem' }}>🏠 ¿Qué son las salas?</strong>
            Las salas son <strong>grupos cerrados</strong> donde podés registrar los ingresos y gastos compartidos con tu pareja o amigos.
          </div>
          <div>
            <strong style={{ display: 'block', color: '#111', marginBottom: '0.25rem' }}>⚖️ División equitativa</strong>
            Gastitos suma los sueldos del hogar y calcula <strong>cuánto aporta cada uno según lo que gana</strong>. Así, los gastos se dividen de forma justa: quien gana más, paga un poco más.          </div>
          <div>
            <strong style={{ display: 'block', color: '#111', marginBottom: '0.25rem' }}>🔗 ¿Cómo invitar a alguien?</strong>
            Adentro de una sala, dale clic a <strong>Compartir</strong> para copiar el enlace y envíaselo por WhatsApp o redes. Cuando entren y se logueen, el creador deberá aceptar su solicitud en el Dashboard.
          </div>
          <div>
            <strong style={{ display: 'block', color: '#111', marginBottom: '0.25rem' }}>👋 ¿Cómo unirse a una sala?</strong>
            Desde el Dashboard, completando el <strong>código de la sala</strong> o abriendo el enlace de invitación que te compartan.
          </div>
        </div>
        <Button variant='primary' style={{ width: '100%', marginTop: '2rem' }} onClick={onClose}>
          Entendido
        </Button>
      </div>
    </div>
  );
};
