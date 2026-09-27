import React from 'react';

// ==========================================
// 1. CLASSIFICATION TEST FIGURE RENDERER (Test 1)
// ==========================================
export const ClassificationFigure: React.FC<{ type: string; rotation?: number }> = ({ type, rotation = 0 }) => {
  return (
    <svg width="48" height="48" viewBox="0 0 100 100" style={{ transform: `rotate(${rotation}deg)` }}>
      <rect width="96" height="96" x="2" y="2" fill="none" stroke="#222" strokeWidth="2" />
      {type === 'arrow_up' && (
        <path d="M50 20 L50 80 M50 20 L35 38 M50 20 L65 38" stroke="#111" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      )}
      {type === 'arrow_down' && (
        <path d="M50 80 L50 20 M50 80 L35 62 M50 80 L65 62" stroke="#111" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      )}
      {type === 'square' && (
        <rect x="25" y="25" width="50" height="50" fill="none" stroke="#111" strokeWidth="6" />
      )}
      {type === 'circle' && (
        <circle cx="50" cy="50" r="28" fill="none" stroke="#111" strokeWidth="6" />
      )}
      {type === 'triangle' && (
        <polygon points="50,22 80,78 20,78" fill="none" stroke="#111" strokeWidth="6" strokeLinejoin="round" />
      )}
      {type === 'triangle_inv' && (
        <polygon points="50,78 80,22 20,22" fill="none" stroke="#111" strokeWidth="6" strokeLinejoin="round" />
      )}
      {type === 'cross' && (
        <g stroke="#111" strokeWidth="6" strokeLinecap="round">
          <line x1="26" y1="26" x2="74" y2="74" />
          <line x1="74" y1="26" x2="26" y2="74" />
        </g>
      )}
      {type === 'plus' && (
        <g stroke="#111" strokeWidth="6" strokeLinecap="round">
          <line x1="50" y1="22" x2="50" y2="78" />
          <line x1="22" y1="50" x2="78" y2="50" />
        </g>
      )}
      {type === 'circle_dot' && (
        <g>
          <circle cx="50" cy="50" r="30" fill="none" stroke="#111" strokeWidth="5" />
          <circle cx="50" cy="50" r="7" fill="#111" />
        </g>
      )}
      {type === 'circle_empty' && (
        <circle cx="50" cy="50" r="30" fill="none" stroke="#111" strokeWidth="5" />
      )}
      {type === 'two_lines' && (
        <g stroke="#111" strokeWidth="6" strokeLinecap="round">
          <line x1="32" y1="25" x2="32" y2="75" />
          <line x1="68" y1="25" x2="68" y2="75" />
        </g>
      )}
      {type === 'three_lines' && (
        <g stroke="#111" strokeWidth="6" strokeLinecap="round">
          <line x1="25" y1="25" x2="25" y2="75" />
          <line x1="50" y1="25" x2="50" y2="75" />
          <line x1="75" y1="25" x2="75" y2="75" />
        </g>
      )}
      {type === 'diag_slash' && (
        <line x1="25" y1="75" x2="75" y2="25" stroke="#111" strokeWidth="6" strokeLinecap="round" />
      )}
      {type === 'diag_backslash' && (
        <line x1="25" y1="25" x2="75" y2="75" stroke="#111" strokeWidth="6" strokeLinecap="round" />
      )}
    </svg>
  );
};

// ==========================================
// 2. SHORT ROUTE GRID MAP (Test 3)
// ==========================================
export const ShortRouteGridMap: React.FC<{ gridNumber: number }> = ({ gridNumber }) => {
  // 5x5 grid with streets, barriers, numbers 1-10, letters A-H, I-M, V-Z
  const topLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
  const rightLetters = ['I', 'J', 'K', 'L', 'M'];
  const leftLetters = ['Z', 'Y', 'X', 'W', 'V'];

  // Checkpoints 1 to 10 coordinates on grid
  const stations = [
    { num: 1, x: 260, y: 150 },
    { num: 2, x: 170, y: 430 },
    { num: 3, x: 220, y: 375 },
    { num: 4, x: 175, y: 375 },
    { num: 5, x: 220, y: 180 },
    { num: 6, x: 175, y: 275 },
    { num: 7, x: 250, y: 250 },
    { num: 8, x: 130, y: 250 },
    { num: 9, x: 360, y: 390 },
    { num: 10, x: 265, y: 315 },
  ];

  // Barriers (White obstacle circles on street intersections)
  const barriers = [
    { x: 90, y: 80 }, { x: 180, y: 80 }, { x: 300, y: 90 }, { x: 370, y: 80 },
    { x: 130, y: 140 }, { x: 220, y: 140 }, { x: 350, y: 140 },
    { x: 70, y: 165 }, { x: 300, y: 170 },
    { x: 110, y: 250 }, { x: 200, y: 250 }, { x: 390, y: 220 },
    { x: 350, y: 270 }, { x: 300, y: 280 }, { x: 390, y: 330 },
    { x: 70, y: 310 }, { x: 165, y: 330 },
    { x: 145, y: 390 }, { x: 280, y: 440 }, { x: 325, y: 440 }, { x: 370, y: 440 }
  ];

  return (
    <div className="short-route-map-wrapper">
      <div className="grid-header-label">Grid - {gridNumber + 1}</div>
      <svg viewBox="0 0 460 480" className="short-route-svg">
        <defs>
          <radialGradient id="watermarkGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#17a2b8" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Background Watermark */}
        <circle cx="230" cy="240" r="140" fill="url(#watermarkGrad)" />

        {/* Street Lines - Horizontal */}
        <line x1="70" y1="80" x2="390" y2="80" stroke="#111" strokeWidth="3" />
        <line x1="70" y1="140" x2="390" y2="140" stroke="#111" strokeWidth="3" />
        <line x1="70" y1="210" x2="390" y2="210" stroke="#111" strokeWidth="3" />
        <line x1="70" y1="280" x2="390" y2="280" stroke="#111" strokeWidth="3" />
        <line x1="70" y1="360" x2="390" y2="360" stroke="#111" strokeWidth="3" />
        <line x1="70" y1="440" x2="390" y2="440" stroke="#111" strokeWidth="3" />

        {/* Street Lines - Vertical */}
        <line x1="70" y1="80" x2="70" y2="440" stroke="#111" strokeWidth="3" />
        <line x1="116" y1="80" x2="116" y2="440" stroke="#111" strokeWidth="3" />
        <line x1="162" y1="80" x2="162" y2="440" stroke="#111" strokeWidth="3" />
        <line x1="208" y1="80" x2="208" y2="440" stroke="#111" strokeWidth="3" />
        <line x1="254" y1="80" x2="254" y2="440" stroke="#111" strokeWidth="3" />
        <line x1="300" y1="80" x2="300" y2="440" stroke="#111" strokeWidth="3" />
        <line x1="346" y1="80" x2="346" y2="440" stroke="#111" strokeWidth="3" />
        <line x1="390" y1="80" x2="390" y2="440" stroke="#111" strokeWidth="3" />

        {/* Outer Perimeter Letter Labels: Top A-H */}
        {topLetters.map((letter, i) => {
          const x = 75 + i * 45;
          return (
            <text key={`top_${letter}`} x={x} y="62" fontSize="16" fontWeight="bold" textAnchor="middle" fill="#111">
              {letter}
            </text>
          );
        })}

        {/* Outer Perimeter Letter Labels: Right I-M */}
        {rightLetters.map((letter, i) => {
          const y = 145 + i * 65;
          return (
            <text key={`right_${letter}`} x="410" y={y} fontSize="16" fontWeight="bold" textAnchor="middle" fill="#111">
              {letter}
            </text>
          );
        })}

        {/* Outer Perimeter Letter Labels: Left Z-V */}
        {leftLetters.map((letter, i) => {
          const y = 145 + i * 65;
          return (
            <text key={`left_${letter}`} x="50" y={y} fontSize="16" fontWeight="bold" textAnchor="middle" fill="#111">
              {letter}
            </text>
          );
        })}

        {/* Street Obstacle Dots (Circles) */}
        {barriers.map((b, i) => (
          <circle key={`barrier_${i}`} cx={b.x} cy={b.y} r="7" fill="#ffffff" stroke="#111" strokeWidth="2.5" />
        ))}

        {/* Numbered Station Checkpoint Boxes 1 to 10 */}
        {stations.map(st => (
          <g key={`station_${st.num}`}>
            <rect x={st.x - 10} y={st.y - 12} width="20" height="20" fill="#fdfdfd" stroke="#111" strokeWidth="2" />
            <text x={st.x} y={st.y + 3} fontSize="13" fontWeight="bold" textAnchor="middle" fill="#111">
              {st.num}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
};

// ==========================================
// 3. INFORMATION ORDERING REFERENCE TABLES (Test 4)
// ==========================================
export const InfoOrderingTables: React.FC = () => {
  return (
    <div className="info-ordering-tables-container">
      {/* Table 1: Process Boxes Modifier Rules */}
      <div className="info-table-card">
        <h4 className="table-title">तालिका-1 / Table-1 (Process Box Rules)</h4>
        <table className="info-process-table">
          <thead>
            <tr>
              <th rowSpan={2} className="col-level">स्तर / Level</th>
              <th colSpan={4}>Process Box / प्रोसेस बॉक्स</th>
            </tr>
            <tr className="sub-header-row">
              <th>A</th>
              <th>B</th>
              <th>C</th>
              <th>D</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="level-name">स्तर Level - 1</td>
              <td>+1</td>
              <td>+2</td>
              <td>+2</td>
              <td>-3</td>
            </tr>
            <tr>
              <td className="level-name">स्तर Level - 2</td>
              <td>-2</td>
              <td>-3</td>
              <td>-1</td>
              <td>-2</td>
            </tr>
            <tr>
              <td className="level-name">स्तर Level - 3</td>
              <td>+3</td>
              <td>-1</td>
              <td>+3</td>
              <td>+1</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Table 2: 12 Standard Geometric Figures */}
      <div className="info-table-card mt-3">
        <h4 className="table-title">तालिका-2 / Table-2 (Figures and their Corresponding Values)</h4>
        <div className="figures-strip">
          {[
            { id: 1, type: 'sq_sm_empty' },
            { id: 2, type: 'sq_lg_empty' },
            { id: 3, type: 'sq_sm_filled' },
            { id: 4, type: 'sq_lg_filled' },
            { id: 5, type: 'cir_sm_empty' },
            { id: 6, type: 'cir_lg_empty' },
            { id: 7, type: 'cir_sm_filled' },
            { id: 8, type: 'cir_lg_filled' },
            { id: 9, type: 'tri_sm_empty' },
            { id: 10, type: 'tri_lg_empty' },
            { id: 11, type: 'tri_sm_filled' },
            { id: 12, type: 'tri_lg_filled' },
          ].map(fig => (
            <div key={fig.id} className="fig-cell">
              <div className="fig-icon-box">
                {renderFigureShape(fig.id)}
              </div>
              <span className="fig-id-label">{fig.id}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export const renderFigureShape = (id: number) => {
  switch (id) {
    case 1: return <rect x="8" y="8" width="16" height="16" fill="none" stroke="#111" strokeWidth="2" />;
    case 2: return <rect x="3" y="3" width="26" height="26" fill="none" stroke="#111" strokeWidth="2.5" />;
    case 3: return <rect x="8" y="8" width="16" height="16" fill="#111" />;
    case 4: return <rect x="3" y="3" width="26" height="26" fill="#111" />;
    case 5: return <circle cx="16" cy="16" r="9" fill="none" stroke="#111" strokeWidth="2" />;
    case 6: return <circle cx="16" cy="16" r="14" fill="none" stroke="#111" strokeWidth="2.5" />;
    case 7: return <circle cx="16" cy="16" r="9" fill="#111" />;
    case 8: return <circle cx="16" cy="16" r="14" fill="#111" />;
    case 9: return <polygon points="16,6 26,26 6,26" fill="none" stroke="#111" strokeWidth="2" />;
    case 10: return <polygon points="16,2 30,29 2,29" fill="none" stroke="#111" strokeWidth="2.5" />;
    case 11: return <polygon points="16,6 26,26 6,26" fill="#111" />;
    case 12: return <polygon points="16,2 30,29 2,29" fill="#111" />;
    default: return <rect x="8" y="8" width="16" height="16" fill="#111" />;
  }
};
