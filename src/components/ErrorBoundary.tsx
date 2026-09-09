'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('⚡ ZenSend Error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          padding: '24px',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          background: '#090d16',
          color: '#f8fafc',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '54px', marginBottom: '16px' }}>⚡</div>
          <h1 style={{
            fontSize: '24px',
            fontWeight: 700,
            marginBottom: '8px',
            letterSpacing: '-0.02em',
          }}>
            เกิดข้อผิดพลาดในการทำงาน
          </h1>
          <p style={{
            fontSize: '14px',
            color: '#94a3b8',
            marginBottom: '24px',
            maxWidth: '400px',
            lineHeight: '1.6',
          }}>
            ZenSend พบปัญหาในการเชื่อมต่อ กรุณารีเฟรชหน้าเว็บเพื่อเริ่มเซสชันใหม่
          </p>
          <button
            onClick={this.handleRetry}
            style={{
              padding: '12px 32px',
              borderRadius: '12px',
              border: '1px solid rgba(14, 165, 233, 0.4)',
              background: 'linear-gradient(135deg, #0ea5e9, #6366f1)',
              color: '#ffffff',
              fontSize: '15px',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 4px 20px rgba(14, 165, 233, 0.3)',
              transition: 'transform 0.2s',
            }}
            onMouseOver={e => (e.currentTarget.style.transform = 'scale(1.03)')}
            onMouseOut={e => (e.currentTarget.style.transform = 'scale(1)')}
          >
            🔄 รีเฟรชหน้าเว็บ
          </button>
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <pre style={{
              marginTop: '24px',
              padding: '16px',
              background: 'rgba(0,0,0,0.05)',
              borderRadius: '12px',
              fontSize: '12px',
              maxWidth: '500px',
              overflow: 'auto',
              textAlign: 'left',
            }}>
              {this.state.error.message}
            </pre>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
