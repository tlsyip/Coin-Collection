import React, { useEffect, useState } from 'react';
import { clearLogs, getLogs, subscribe } from '../logging';

function DebugPanel() {
  const [visible, setVisible] = useState(false);
  const [logs, setLogs] = useState<string[]>(getLogs());

  useEffect(() => {
    const unsubscribe = subscribe(() => {
      setLogs(getLogs());
    });
    return unsubscribe;
  }, []);

  return (
    <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1200 }}>
      <button
        type="button"
        onClick={() => setVisible((current) => !current)}
        style={{
          width: '100%',
          padding: '12px 16px',
          backgroundColor: '#0f172a',
          color: '#f8fafc',
          border: 'none',
          fontSize: '16px',
          textAlign: 'left',
          cursor: 'pointer',
        }}
      >
        {visible ? 'Hide Logs' : 'Show Logs'}
      </button>

      {visible && (
        <div
          style={{
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            color: '#f8fafc',
            maxHeight: '40vh',
            overflowY: 'auto',
            padding: '12px',
            fontFamily: 'monospace',
            fontSize: '12px',
            lineHeight: '1.4',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span>Log history</span>
            <button
              type="button"
              onClick={() => clearLogs()}
              style={{
                backgroundColor: '#ef4444',
                color: '#f8fafc',
                border: 'none',
                borderRadius: '4px',
                padding: '4px 8px',
                cursor: 'pointer',
                fontSize: '12px',
              }}
            >
              Clear Logs
            </button>
          </div>
          <div>
            {logs.map((entry, index) => (
              <div key={`${entry}-${index}`} style={{ padding: '2px 0' }}>
                {entry}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default DebugPanel;
