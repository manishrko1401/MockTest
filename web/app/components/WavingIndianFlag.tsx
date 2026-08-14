"use client";

import React from 'react';

interface WavingIndianFlagProps {
  size?: 'sm' | 'md' | 'lg';
  showPole?: boolean;
  className?: string;
}

export default function WavingIndianFlag({
  size = 'md',
  showPole = true,
  className = ''
}: WavingIndianFlagProps) {
  const dimensions = {
    sm: { width: 48, height: 32, poleH: 42 },
    md: { width: 68, height: 44, poleH: 56 },
    lg: { width: 92, height: 60, poleH: 74 },
  }[size];

  return (
    <div className={`inline-flex items-end select-none pointer-events-none ${className}`}>
      <svg
        viewBox="0 0 100 70"
        className={
          size === 'sm'
            ? 'w-12 h-9 drop-shadow-md'
            : size === 'lg'
            ? 'w-24 h-16 drop-shadow-xl'
            : 'w-16 h-12 sm:w-20 sm:h-14 drop-shadow-lg'
        }
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Saffron gradient with realistic fabric lighting */}
          <linearGradient id="saffronWave" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#FF671F" />
            <stop offset="25%" stopColor="#FFA040" />
            <stop offset="50%" stopColor="#FF5500" />
            <stop offset="75%" stopColor="#FFA84A" />
            <stop offset="100%" stopColor="#E65100" />
          </linearGradient>

          {/* White gradient with fabric shadow */}
          <linearGradient id="whiteWave" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#F8FAFC" />
            <stop offset="25%" stopColor="#FFFFFF" />
            <stop offset="50%" stopColor="#E2E8F0" />
            <stop offset="75%" stopColor="#FFFFFF" />
            <stop offset="100%" stopColor="#CBD5E1" />
          </linearGradient>

          {/* Green gradient with realistic fabric lighting */}
          <linearGradient id="greenWave" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#046A38" />
            <stop offset="25%" stopColor="#10B981" />
            <stop offset="50%" stopColor="#065F46" />
            <stop offset="75%" stopColor="#34D399" />
            <stop offset="100%" stopColor="#064E3B" />
          </linearGradient>

          {/* Golden pole gradient */}
          <linearGradient id="goldPole" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#D97706" />
            <stop offset="40%" stopColor="#FDE68A" />
            <stop offset="70%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#B45309" />
          </linearGradient>

          {/* Shadow/Gloss overlay on waving cloth */}
          <linearGradient id="waveSheen" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#000000" stopOpacity="0.05" />
            <stop offset="30%" stopColor="#FFFFFF" stopOpacity="0.25" />
            <stop offset="55%" stopColor="#000000" stopOpacity="0.1" />
            <stop offset="80%" stopColor="#FFFFFF" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0.15" />
          </linearGradient>
        </defs>

        {/* FLAG POLE (Left mast with golden sphere topper) */}
        {showPole && (
          <g>
            {/* Pole Base / Mast */}
            <rect x="10" y="8" width="3" height="60" rx="1.5" fill="url(#goldPole)" />
            {/* Golden Finial Sphere on top of pole */}
            <circle cx="11.5" cy="8" r="3" fill="url(#goldPole)" stroke="#B45309" strokeWidth="0.5" />
            {/* Golden Spear Tip */}
            <polygon points="11.5,2 14,8 9,8" fill="#F59E0B" />
            {/* Pole Ring / Attachment loops */}
            <circle cx="11.5" cy="14" r="2" fill="#D97706" />
            <circle cx="11.5" cy="46" r="2" fill="#D97706" />
          </g>
        )}

        {/* WAVING FLAG CLOTH (Animated with wave-like ripple keyframe) */}
        <g className="animate-flag-wave" style={{ transformOrigin: '13px 30px' }}>
          {/* Flag Outline Clip with Waving Curves */}
          {/* 1. Saffron Stripe (Top) */}
          <path
            d="M13 14 C28 10, 42 18, 56 13 C70 8, 82 16, 94 12 L94 24 C82 28, 70 20, 56 25 C42 30, 28 22, 13 26 Z"
            fill="url(#saffronWave)"
          />

          {/* 2. White Stripe (Middle) */}
          <path
            d="M13 26 C28 22, 42 30, 56 25 C70 20, 82 28, 94 24 L94 36 C82 40, 70 32, 56 37 C42 42, 28 34, 13 38 Z"
            fill="url(#whiteWave)"
          />

          {/* 3. India Green Stripe (Bottom) */}
          <path
            d="M13 38 C28 34, 42 42, 56 37 C70 32, 82 40, 94 36 L94 48 C82 52, 70 44, 56 49 C42 54, 28 46, 13 50 Z"
            fill="url(#greenWave)"
          />

          {/* Fabric Dynamic Sheen & Ripples overlay */}
          <path
            d="M13 14 C28 10, 42 18, 56 13 C70 8, 82 16, 94 12 L94 48 C82 52, 70 44, 56 49 C42 54, 28 46, 13 50 Z"
            fill="url(#waveSheen)"
          />

          {/* Ashoka Chakra in the Center of White Stripe */}
          <g transform="translate(53.5, 30.5) scale(0.12)" className="animate-chakra-spin">
            <circle cx="0" cy="0" r="48" fill="none" stroke="#000080" strokeWidth="6" />
            <circle cx="0" cy="0" r="10" fill="#000080" />
            {Array.from({ length: 24 }).map((_, i) => (
              <line
                key={i}
                x1="0"
                y1="0"
                x2={46 * Math.cos((i * 15 * Math.PI) / 180)}
                y2={46 * Math.sin((i * 15 * Math.PI) / 180)}
                stroke="#000080"
                strokeWidth="3.5"
              />
            ))}
          </g>
        </g>
      </svg>
    </div>
  );
}
