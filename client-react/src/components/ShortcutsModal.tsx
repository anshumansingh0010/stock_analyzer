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
    >
      <div 
        className="shortcuts-modal-card" 
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="shortcuts-header">
          <div className="shortcuts-header-title">
            <span className="shortcuts-header-emoji">⌨️</span>
            <div>
              <h3 className="shortcuts-title">
                Custom Keyboard Shortcuts
              </h3>
              <p className="shortcuts-subtitle">
                Click "Rebind" on any shortcut to set your own hotkey
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            title="Close modal"
            className="shortcuts-close-btn"
          >
            ✕
          </button>
        </div>

        {/* Shortcuts List */}
        <div className="shortcuts-list">
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
                className={`shortcut-item ${isRecording ? 'is-recording' : ''} ${s.action ? 'is-clickable' : ''}`}
              >
                <div className="shortcut-item-label">
                  <span className="shortcut-label-text">
                    {s.label}
                  </span>
                  {customKey && (
                    <span className="shortcut-customized">
                      Customized
                    </span>
                  )}
                </div>

                <div className="shortcut-actions">
                  {isRecording ? (
                    <span className="shortcut-recording-text">
                      Press key combo...
                    </span>
                  ) : (
                    <>
                      <div className="shortcut-keys">
                        {customKey ? (
                          <kbd className="shortcut-kbd is-custom">
                            {customKey}
                          </kbd>
                        ) : (
                          s.defaultKeys.map(k => (
                            <kbd key={k} className="shortcut-kbd">
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
                        className="shortcut-rebind-btn"
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
                          className="shortcut-reset-btn"
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
        <div className="shortcuts-footer">
          <span className="shortcuts-footer-text">
            Press <kbd className="shortcuts-footer-kbd">?</kbd> anytime
          </span>

          <button
            onClick={() => {
              resetCustomShortcuts();
              showToast('All shortcuts reset to defaults', 'success');
            }}
            className="shortcuts-reset-all"
          >
            ↺ Reset All Defaults
          </button>
        </div>
      </div>
    </div>
  );
}
