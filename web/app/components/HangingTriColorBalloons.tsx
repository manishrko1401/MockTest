"use client";

import React from 'react';

// Ashoka Chakra 24-spoke SVG icon
export function ChakraSymbol({ className = "w-3 h-3 text-blue-900" }: { className?: string }) {
  return (
    <svg className={`${className} animate-chakra-spin shrink-0`} viewBox="0 0 100 100" fill="currentColor">
      <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeWidth="5" />
      <circle cx="50" cy="50" r="10" fill="currentColor" />
      {Array.from({ length: 24 }).map((_, i) => (
        <line
          key={i}
          x1="50"
          y1="50"
          x2={50 + 44 * Math.cos((i * 15 * Math.PI) / 180)}
          y2={50 + 44 * Math.sin((i * 15 * Math.PI) / 180)}
          stroke="currentColor"
          strokeWidth="2.5"
        />
      ))}
    </svg>
  );
}

interface HangingTriColorBalloonsProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'left' | 'right' | 'center';
  className?: string;
}

export default function HangingTriColorBalloons({
  size = 'md',
  variant = 'center',
  className = ''
}: HangingTriColorBalloonsProps) {
  const sizeClasses = {
    sm: "w-12 h-14 drop-shadow-md",
    md: "w-20 h-24 drop-shadow-lg",
    lg: "w-28 h-32 drop-shadow-xl",
    xl: "w-36 h-40 sm:w-44 sm:h-48 drop-shadow-2xl"
  }[size] || "w-24 h-28 drop-shadow-xl";

  const isRight = variant === 'right';
  const isLeft = variant === 'left';

  const swayClass = isRight
    ? 'animate-balloon-sway-right'
    : isLeft
    ? 'animate-balloon-sway-left'
    : 'animate-balloon-sway-left';

  return (
    <div
      className={`inline-flex flex-col items-center select-none pointer-events-none ${swayClass} ${className}`}
      style={{ transformOrigin: 'top center' }}
    >
      <svg
        viewBox="0 0 120 120"
        className={sizeClasses}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Saffron Balloon Rich Radial Gradient */}
          <radialGradient id="saffronHangGradLarge" cx="35%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#FFA64D" />
            <stop offset="35%" stopColor="#FF7300" />
            <stop offset="75%" stopColor="#E65100" />
            <stop offset="100%" stopColor="#BF360C" />
          </radialGradient>

          {/* White Balloon Pearl Radial Gradient */}
          <radialGradient id="whiteHangGradLarge" cx="35%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="50%" stopColor="#F1F5F9" />
            <stop offset="80%" stopColor="#CBD5E1" />
            <stop offset="100%" stopColor="#94A3B8" />
          </radialGradient>

          {/* Green Balloon Rich Radial Gradient */}
          <radialGradient id="greenHangGradLarge" cx="35%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#4ADE80" />
            <stop offset="35%" stopColor="#16A34A" />
            <stop offset="75%" stopColor="#15803D" />
            <stop offset="100%" stopColor="#052E16" />
          </radialGradient>

          {/* Golden Ribbon Gradient */}
          <linearGradient id="goldRibbon" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FDE047" />
            <stop offset="50%" stopColor="#EAB308" />
            <stop offset="100%" stopColor="#CA8A04" />
          </linearGradient>

          {/* Saffron Ribbon Gradient */}
          <linearGradient id="saffronRibbon" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FF9800" />
            <stop offset="100%" stopColor="#E65100" />
          </linearGradient>

          {/* Green Ribbon Gradient */}
          <linearGradient id="greenRibbon" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#22C55E" />
            <stop offset="100%" stopColor="#15803D" />
          </linearGradient>
        </defs>

        {/* --- TOP HANGING ATTACHMENT PIN & DANGLING STRINGS --- */}
        {/* Top Pinned Golden Disc */}
        <circle cx="60" cy="4" r="3.5" fill="url(#goldRibbon)" stroke="#854D0E" strokeWidth="1" />
        <circle cx="60" cy="4" r="1.5" fill="#FEF08A" />

        {/* Main Golden Hanging Tethers */}
        <line x1="60" y1="4" x2="60" y2="14" stroke="#FDE047" strokeWidth="1.8" strokeLinecap="round" />

        {/* String to Left Saffron Balloon */}
        <path
          d="M60 14 Q44 24 30 36"
          stroke="#FDE047"
          strokeWidth="1.5"
          strokeLinecap="round"
          fill="none"
          opacity="0.9"
        />

        {/* String to Center White Balloon */}
        <path
          d="M60 14 Q62 28 60 44"
          stroke="#E2E8F0"
          strokeWidth="1.6"
          strokeLinecap="round"
          fill="none"
          opacity="0.95"
        />

        {/* String to Right Green Balloon */}
        <path
          d="M60 14 Q76 24 90 36"
          stroke="#86EFAC"
          strokeWidth="1.5"
          strokeLinecap="round"
          fill="none"
          opacity="0.9"
        />

        {/* Top Festive Ribbon Bow */}
        <g transform="translate(60, 13)">
          {/* Left Bow Loop */}
          <path
            d="M0 0 C-8 -8 -16 -4 -12 2 C-8 6 -3 2 0 0 Z"
            fill="url(#saffronRibbon)"
            stroke="#C2410C"
            strokeWidth="0.6"
          />
          {/* Right Bow Loop */}
          <path
            d="M0 0 C8 -8 16 -4 12 2 C8 6 3 2 0 0 Z"
            fill="url(#greenRibbon)"
            stroke="#166534"
            strokeWidth="0.6"
          />
          {/* Center Bow Knot */}
          <circle cx="0" cy="0" r="2.5" fill="url(#goldRibbon)" stroke="#854D0E" strokeWidth="0.6" />
        </g>

        {/* --- BALLOON 1: SAFFRON (LEFT) --- */}
        <g transform="translate(0, 0)">
          {/* Balloon knot */}
          <polygon points="27,35 33,35 30,31" fill="#C2410C" />
          {/* Large Saffron Balloon body */}
          <ellipse cx="30" cy="54" rx="19" ry="23" fill="url(#saffronHangGradLarge)" />
          {/* 3D Specular Highlight 1 */}
          <ellipse cx="23" cy="45" rx="6" ry="10" fill="#FFFFFF" opacity="0.45" transform="rotate(-20, 23, 45)" />
          {/* 3D Specular Highlight 2 */}
          <ellipse cx="21" cy="41" rx="2.5" ry="4.5" fill="#FFFFFF" opacity="0.85" transform="rotate(-20, 21, 41)" />
          {/* Bottom curve soft highlight */}
          <path d="M19 62 C24 72 36 72 41 62" stroke="#FFCC80" strokeWidth="1.2" fill="none" opacity="0.5" />
        </g>

        {/* --- BALLOON 3: GREEN (RIGHT) --- */}
        <g transform="translate(0, 0)">
          {/* Balloon knot */}
          <polygon points="87,35 93,35 90,31" fill="#14532D" />
          {/* Large Green Balloon body */}
          <ellipse cx="90" cy="54" rx="19" ry="23" fill="url(#greenHangGradLarge)" />
          {/* 3D Specular Highlight 1 */}
          <ellipse cx="83" cy="45" rx="6" ry="10" fill="#FFFFFF" opacity="0.45" transform="rotate(-20, 83, 45)" />
          {/* 3D Specular Highlight 2 */}
          <ellipse cx="81" cy="41" rx="2.5" ry="4.5" fill="#FFFFFF" opacity="0.85" transform="rotate(-20, 81, 41)" />
          {/* Bottom curve soft highlight */}
          <path d="M79 62 C84 72 96 72 101 62" stroke="#A7F3D0" strokeWidth="1.2" fill="none" opacity="0.5" />
        </g>

        {/* --- BALLOON 2: WHITE WITH CHAKRA (CENTER FOREGROUND) --- */}
        <g transform="translate(0, 0)">
          {/* Balloon knot */}
          <polygon points="57,43 63,43 60,39" fill="#64748B" />
          {/* Large White Balloon body */}
          <ellipse cx="60" cy="65" rx="21" ry="25" fill="url(#whiteHangGradLarge)" stroke="#E2E8F0" strokeWidth="0.8" />
          {/* 3D Specular Highlight 1 */}
          <ellipse cx="52" cy="55" rx="7" ry="11" fill="#FFFFFF" opacity="0.75" transform="rotate(-20, 52, 55)" />
          {/* 3D Specular Highlight 2 */}
          <ellipse cx="50" cy="51" rx="3" ry="5.5" fill="#FFFFFF" opacity="0.95" transform="rotate(-20, 50, 51)" />

          {/* Central Ashoka Chakra */}
          <g transform="translate(51.5, 57.5) scale(0.17)">
            <circle cx="50" cy="50" r="46" fill="none" stroke="#000080" strokeWidth="5.5" />
            <circle cx="50" cy="50" r="10" fill="#000080" />
            {Array.from({ length: 24 }).map((_, i) => (
              <line
                key={i}
                x1="50"
                y1="50"
                x2={50 + 44 * Math.cos((i * 15 * Math.PI) / 180)}
                y2={50 + 44 * Math.sin((i * 15 * Math.PI) / 180)}
                stroke="#000080"
                strokeWidth="3"
              />
            ))}
          </g>
        </g>

        {/* --- CELEBRATORY CASCADING CURLY RIBBONS & STREAMERS --- */}
        {/* 1. Saffron Spiral Ribbon on Left */}
        <path
          d="M30 77 Q35 84 26 91 Q18 97 32 103 Q42 108 30 115 Q26 118 28 120"
          stroke="url(#saffronRibbon)"
          strokeWidth="2.4"
          strokeLinecap="round"
          fill="none"
        />
        {/* Saffron Ribbon Accent Shadow */}
        <path
          d="M30 77 Q35 84 26 91 Q18 97 32 103 Q42 108 30 115"
          stroke="#FFD8A8"
          strokeWidth="0.8"
          strokeLinecap="round"
          fill="none"
          opacity="0.8"
        />

        {/* 2. Golden Celebration Streamer in Center-Left */}
        <path
          d="M50 88 Q42 94 54 100 Q62 105 48 112 Q44 115 47 119"
          stroke="url(#goldRibbon)"
          strokeWidth="2.2"
          strokeLinecap="round"
          fill="none"
        />

        {/* 3. Central Long Tri-Color Flowing Streamer */}
        <path
          d="M60 90 Q68 96 58 103 Q48 109 64 114 Q70 117 62 120"
          stroke="#3B82F6"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
          opacity="0.85"
        />

        {/* 4. Golden Celebration Streamer in Center-Right */}
        <path
          d="M72 88 Q80 94 68 100 Q58 105 74 112 Q78 115 75 119"
          stroke="url(#goldRibbon)"
          strokeWidth="2.2"
          strokeLinecap="round"
          fill="none"
        />

        {/* 5. Green Spiral Ribbon on Right */}
        <path
          d="M90 77 Q85 84 94 91 Q102 97 88 103 Q78 108 90 115 Q94 118 92 120"
          stroke="url(#greenRibbon)"
          strokeWidth="2.4"
          strokeLinecap="round"
          fill="none"
        />
        {/* Green Ribbon Accent Highlight */}
        <path
          d="M90 77 Q85 84 94 91 Q102 97 88 103 Q78 108 90 115"
          stroke="#BBF7D0"
          strokeWidth="0.8"
          strokeLinecap="round"
          fill="none"
          opacity="0.8"
        />

        {/* Tiny Festive Sparkle Star on Ribbon */}
        <g transform="translate(32, 102) scale(0.6)">
          <path d="M0 -4 L1 -1 L4 0 L1 1 L0 4 L-1 1 L-4 0 L-1 -1 Z" fill="#FDE047" />
        </g>
        <g transform="translate(88, 102) scale(0.6)">
          <path d="M0 -4 L1 -1 L4 0 L1 1 L0 4 L-1 1 L-4 0 L-1 -1 Z" fill="#FDE047" />
        </g>
      </svg>
    </div>
  );
}
