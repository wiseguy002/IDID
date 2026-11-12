import { Component, type ReactNode } from 'react';

/** If something breaks, show a calm page instead of a blank screen. Journal data is untouched (it's encrypted on disk). */
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null; showDetails: boolean }> {
  state = { error: null as Error | null, showDetails: false };
  static getDerivedStateFromError(error: Error) { return { error, showDetails: false }; }
  componentDidCatch(error: Error) { console.error('iDID error:', error); }
  render() {
    const { error, showDetails } = this.state;
    if (!error) return this.props.children;
    return (
      <div className="lock" role="alert">
        <div style={{ maxWidth: 440, textAlign: 'center' }}>
          <div className="brand-mark" style={{ width: 72, height: 72, margin: '0 auto 1rem' }} aria-hidden="true">
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M5 19c0-8 5-13 15-14-1 10-6 15-14 15M5 19c3-4 6-6.5 9-8" /></svg>
          </div>
          <div className="eyebrow">Something went wrong</div>
          <h1>iDID tripped over its own leaves.</h1>
          <p className="muted">That's on us, not you. Things don't always go as planned. What matters is the next gentle step.</p>
          <div className="card accent" style={{ textAlign: 'left' }}><b>Your journal is safe.</b> Everything is still saved and encrypted on this device.</div>
          <div className="row" style={{ justifyContent: 'center' }}>
            <button className="btn primary" onClick={() => this.setState({ error: null })}>Try again</button>
            <button className="btn" onClick={() => location.reload()}>Reload iDID</button>
          </div>
          <p className="small muted" style={{ marginTop: '1.2rem' }}>If it keeps happening, tell us at hello@idid.care, and include the details below. They don't contain anything you wrote.</p>
          <button className="btn ghost sm" onClick={() => this.setState({ showDetails: !showDetails })}>{showDetails ? 'Hide' : 'Show'} details</button>
          {showDetails && <pre className="small" style={{ textAlign: 'left', whiteSpace: 'pre-wrap', background: 'var(--surface-2)', padding: '.8rem', borderRadius: 12 }}>{error.name}: {error.message}</pre>}
          <p className="small muted">Need support right now? Call or text <b>988</b>, any time.</p>
        </div>
      </div>
    );
  }
}
