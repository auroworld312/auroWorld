import Header from './components/Header';
import Sidebar from './components/Sidebar';
import { useAccessibility } from './AccessibilityContext';
import './AccountSettings.css';

export default function Settings() {
  const { theme, setTheme, textSize, setTextSize, boldText, setBoldText } = useAccessibility();
  const sizes = ['Small', 'Medium', 'Semi-large', 'Large', 'Extra Large'];
  return <div className="account-page settings-page">
    <Sidebar />
    <div className="settings-main"><Header />
      <main className="account-content">
        <h1>Settings</h1>
        <section className="settings-section">
          <h2>Contrast Themes</h2>
          <div className="theme-options">
            {['light', 'dark'].map(value => <button key={value} className={`theme-option theme-${value}`} aria-pressed={theme === value} onClick={() => setTheme(value)}>
              <span className="theme-sample"><strong>Aa</strong><span>Button</span></span>
              <span>{value === 'light' ? 'Light' : 'Dark'}</span>
            </button>)}
          </div>
        </section>
        <section className="settings-section">
          <h2 id="text-size-label">Text Size</h2>
          <div className="text-size-control">
            <div className="text-size-samples" aria-hidden="true">{sizes.map((label, i) => <span key={label} style={{ fontSize: 14 + i * 4 }}>Aa</span>)}</div>
            <input aria-labelledby="text-size-label" aria-valuetext={sizes[textSize - 1]} type="range" min="1" max="5" step="1" value={textSize} onChange={e => setTextSize(Number(e.target.value))} />
            <div className="text-size-labels">{sizes.map(label => <span key={label}>{label}</span>)}</div>
          </div>
        </section>
        <section className="settings-section">
          <h2>Bold Text</h2>
          <div className="bold-preview" aria-hidden="true"><span>Aa</span><span>&gt;</span><strong>Aa</strong></div>
          <div className="settings-segment" aria-label="Bold text">
            {[false, true].map(value => <button key={String(value)} aria-pressed={boldText === value} onClick={() => setBoldText(value)}>{value ? 'On' : 'Off'}</button>)}
          </div>
        </section>
      </main>
    </div>
  </div>;
}
