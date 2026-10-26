import { createContext, useContext, useState, useEffect } from 'react';
import './Accessibility.css';
const AccessibilityContext = createContext();

function savedPreferences() {
  try { return JSON.parse(localStorage.getItem('auroworld:accessibility')) || {}; } catch { return {}; }
}

export function AccessibilityProvider({ children }) {
  const [theme, setTheme] = useState(() => savedPreferences().theme === 'dark' ? 'dark' : 'light');
  const [textSize, setTextSize] = useState(() => [1, 2, 3, 4, 5].includes(savedPreferences().textSize) ? savedPreferences().textSize : 3);
  const [boldText, setBoldText] = useState(() => savedPreferences().boldText === true);

  useEffect(() => {
    document.body.style.zoom = '';
    document.getElementById('bold-text-style')?.remove();
    document.getElementById('contrast-style')?.remove();
    document.documentElement.dataset.theme = theme;
    document.documentElement.dataset.boldText = String(boldText);
    try { localStorage.setItem('auroworld:accessibility', JSON.stringify({ theme, textSize, boldText })); } catch {}
  }, [theme, textSize, boldText]);

  useEffect(() => {
    const root = document.getElementById('root') || document.body;
    const reset = () => root.querySelectorAll('[data-scaled-text]').forEach(el => {
      el.removeAttribute('data-scaled-text');
      el.style.removeProperty('--accessible-font-size');
    });
    reset();
    const factor = [0.85, 0.93, 1, 1.15, 1.3][textSize - 1];
    if (factor === 1) return;
    const scale = () => {
      reset();
      const targets = [...root.querySelectorAll('*')].filter(el => !el.hasAttribute('data-scaled-text') && !el.closest('svg, .theme-sample, .text-size-samples, .bold-preview') && !el.matches('script, style, i, img, video, canvas') && ([...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()) || el.matches('input, textarea, select')));
      const sizes = targets.map(el => parseFloat(getComputedStyle(el).fontSize));
      targets.forEach((el, i) => {
        if (!Number.isFinite(sizes[i])) return;
        el.style.setProperty('--accessible-font-size', `${sizes[i] * factor}px`);
        el.setAttribute('data-scaled-text', 'true');
      });
    };
    scale();
    const observer = new MutationObserver(scale);
    observer.observe(root, { childList: true, subtree: true });
    return () => { observer.disconnect(); reset(); };
  }, [textSize]);

  return <AccessibilityContext.Provider value={{ theme, setTheme, textSize, setTextSize, boldText, setBoldText }}>{children}</AccessibilityContext.Provider>;
}
export function useAccessibility() { return useContext(AccessibilityContext); }
