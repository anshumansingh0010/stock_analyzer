import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { TabType } from '../types';
import { DEFAULT_SHORTCUTS, formatKeyEvent } from '../utils/shortcuts';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTab: (tab: TabType) => void;
}

export default function ShortcutsModal({ isOpen, onClose, onSelectTab }: ShortcutsModalProps) {
  const { customShortcuts, updateCustomShortcut, resetCustomShortcuts, showToast } = useApp();
  const [recordingId, setRecordingId] = useState<string | null>(null);

  // Capture key combo when in recording mode
  useEffect(() => {
    if (!recordingId) return;
    const currentRecordingId = recordingId;

    function handleRecordKey(e: KeyboardEvent) {
      e.preventDefault();
      e.stopPropagation();

      if (e.key === 'Escape') {
        setRecordingId(null);
        showToast('Key recording cancelled', 'info');
        return;
      }

      const formatted = formatKeyEvent(e);
      if (formatted) {
        const item = DEFAULT_SHORTCUTS.find(s => s.id === currentRecordingId);
        updateCustomShortcut(currentRecordingId, formatted);
        showToast(`Shortcut for "${item?.label || 'Action'}" set to ${formatted}`, 'success');
        setRecordingId(null);
      }
    }

    window.addEventListener('keydown', handleRecordKey, { capture: true });
    return () => window.removeEventListener('keydown', handleRecordKey, { capture: true });
  }, [recordingId, updateCustomShortcut, showToast]);

  if (!isOpen) return null;

  return (
    <div 
      className="auth-backdrop" 
      onClick={() => {
        if (recordingId) setRecordingId(null);
        else onClose();
      }} 
      style={{ 
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        background: 'rgba(10, 12, 18, 0.78)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}
    >
      <div 
        className="shortcuts-modal-card" 
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--bg-surface, #131722)',
          border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.12))',
          borderRadius: '18px',
          width: '100%',
          maxWidth: '480px',
          padding: '24px',
          boxShadow: '0 24px 60px rgba(0,0,0,0.65), 0 0 35px rgba(99, 102, 241, 0.18)',
          animation: 'modalSlide 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
          position: 'relative'
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '1.4rem' }}>⌨️</span>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                Custom Keyboard Shortcuts
              </h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>
                Click "Rebind" on any shortcut to set your own hotkey
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            title="Close modal"
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              fontSize: '1.2rem',
              padding: '4px 8px',
              borderRadius: '6px'
            }}
          >
            ✕
          </button>
        </div>

        {/* Shortcuts List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {DEFAULT_SHORTCUTS.map((s) => {
            const isRecording = recordingId === s.id;
            const customKey = customShortcuts[s.id];

            return (
              <div 
                key={s.id} 
                onClick={() => {
                  if (recordingId) return;
                  if (s.action) {
                    onSelectTab(s.action);
                    onClose();
                  }
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  background: isRecording 
                    ? 'color-mix(in srgb, var(--accent-primary, #6366f1) 15%, var(--bg-elevated))' 
                    : 'var(--bg-elevated, rgba(255,255,255,0.04))',
                  border: isRecording 
                    ? '1.5px solid var(--accent-primary, #6366f1)' 
                    : '1px solid var(--border-subtle, rgba(255,255,255,0.08))',
                  borderRadius: '12px',
                  cursor: s.action ? 'pointer' : 'default',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 600 }}>
                    {s.label}
                  </span>
                  {customKey && (
                    <span style={{ fontSize: '0.68rem', color: '#10b981', fontWeight: 500 }}>
                      Customized
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {isRecording ? (
                    <span style={{ 
                      fontSize: '0.75rem', 
                      color: '#6366f1', 
                      fontWeight: 700,
                      animation: 'pulse 1.5s infinite',
                      background: 'rgba(99, 102, 241, 0.12)',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      border: '1px dashed #6366f1'
                    }}>
                      Press key combo...
                    </span>
                  ) : (
                    <>
                      <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                        {customKey ? (
                          <kbd 
                            style={{
                              background: 'color-mix(in srgb, #10b981 15%, var(--bg-surface))',
                              border: '1px solid #10b981',
                              borderRadius: '6px',
                              padding: '3px 9px',
                              fontSize: '0.75rem',
                              fontFamily: 'var(--font-mono)',
                              fontWeight: 700,
                              color: '#10b981',
                              boxShadow: '0 2px 0 rgba(16, 185, 129, 0.3)'
                            }}
                          >
                            {customKey}
                          </kbd>
                        ) : (
                          s.defaultKeys.map(k => (
                            <kbd 
                              key={k} 
                              style={{
                                background: 'var(--bg-surface, #18181b)',
                                border: '1px solid var(--border-subtle, rgba(255,255,255,0.1))',
                                borderRadius: '6px',
                                padding: '3px 8px',
                                fontSize: '0.73rem',
                                fontFamily: 'var(--font-mono)',
                                fontWeight: 700,
                                color: 'var(--accent-primary, #6366f1)',
                                boxShadow: '0 2px 0 var(--border-subtle)'
                              }}
                            >
                              {k}
                            </kbd>
                          ))
                        )}
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setRecordingId(isRecording ? null : s.id);
                        }}
                        title="Rebind shortcut key"
                        style={{
                          background: 'var(--bg-surface, #18181b)',
                          border: '1px solid var(--border-subtle)',
                          color: 'var(--text-muted)',
                          cursor: 'pointer',
                          fontSize: '0.7rem',
                          fontWeight: 600,
                          padding: '4px 8px',
                          borderRadius: '6px',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        Rebind
                      </button>

                      {customKey && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            updateCustomShortcut(s.id, null);
                            showToast(`Reset shortcut for "${s.label}"`, 'info');
                          }}
                          title="Reset shortcut to default"
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--text-muted)',
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                            padding: '2px 4px',
                            borderRadius: '4px'
                          }}
                        >
                          ✕
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer actions */}
        <div style={{ 
          marginTop: '20px', 
          paddingTop: '14px', 
          borderTop: '1px solid var(--border-subtle, rgba(255,255,255,0.1))', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between' 
        }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Press <kbd style={{ background: 'var(--bg-elevated)', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--border-subtle)', fontSize: '0.7rem' }}>?</kbd> anytime
          </span>

          <button
            onClick={() => {
              resetCustomShortcuts();
              showToast('All shortcuts reset to defaults', 'success');
            }}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              fontSize: '0.78rem',
              fontWeight: 600,
              textDecoration: 'underline'
            }}
          >
            ↺ Reset All Defaults
          </button>
        </div>
      </div>
    </div>
  );
}
