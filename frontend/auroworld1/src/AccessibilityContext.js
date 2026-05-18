import { createContext, useContext, useState, useEffect } from 'react';
const AccessibilityContext = createContext();

export function AccessibilityProvider({ children }) {
  const [contrast, setContrast] = useState('good');
  const [textSize, setTextSize] = useState(3);
  const [boldText, setBoldText] = useState(false);
 
  useEffect(() => {
     const textSizeMap = { 1: 0.8, 2: 0.9, 3: 1, 4: 1.15, 5: 1.3 };
    document.body.style.zoom = textSizeMap[textSize];
  }, [textSize]);
  useEffect(() => {
    let styleEl = document.getElementById('bold-text-style');
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'bold-text-style';
      document.head.appendChild(styleEl);
    }
    styleEl.textContent = boldText
      ? '* { font-weight: 700 !important; }'
      : '* { font-weight: unset; }';
  }, [boldText]);
  useEffect(() => {
    let styleEl = document.getElementById('contrast-style');
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'contrast-style';
      document.head.appendChild(styleEl);
    }
    if (contrast === 'high') {
      styleEl.textContent = `
        body, body * { background-color: #000 !important; color: #fff !important; border-color: #555 !important; }
        input, textarea, select { background-color: #111 !important; color: #fff !important; }
        a { color: #adf !important; }
      `;
    } else if (contrast === 'readable') {
      styleEl.textContent = `
        body { background-color: #fafafa !important; }
        body * { color: #444 !important; }
      `;
    } else {
      styleEl.textContent = '';
    }
  }, [contrast]);
  return (
    <AccessibilityContext.Provider value={{ contrast, setContrast, textSize, setTextSize, boldText, setBoldText }}>
      {children}
    </AccessibilityContext.Provider>
  );
}
export function useAccessibility() {
  return useContext(AccessibilityContext);
}