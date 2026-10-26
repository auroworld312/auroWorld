import { useState, useId } from 'react';

export default function UnitForm({ heading, initialTitle = '', saving, error, onSave, onCancel }) {
    const [title, setTitle] = useState(initialTitle);
    const id = useId();
    return <form className="unit-editor" onClick={event => event.stopPropagation()} onSubmit={event => { event.preventDefault(); if (title.trim() && !saving) onSave(title.trim()); }}>
        <h3>{heading}</h3>
        <label htmlFor={id}>Unit name <span aria-hidden="true">*</span></label>
        <input id={id} value={title} onChange={event => setTitle(event.target.value)} required autoFocus disabled={saving} />
        {error && <p role="alert">{error}</p>}
        <div className="unit-editor-actions">
            <button type="submit" disabled={saving || !title.trim()}>{saving ? 'Saving...' : heading === 'Create Unit' ? 'Create' : 'Save Changes'}</button>
            <button type="button" disabled={saving} onClick={onCancel}>Cancel</button>
        </div>
    </form>;
}
