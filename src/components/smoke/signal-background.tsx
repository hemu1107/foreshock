import { useState } from 'react';
import { Pause, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function SignalBackground() {
  const [paused, setPaused] = useState(false);
  return <>
    <div className={`signal-background${paused ? ' motion-paused' : ''}`} aria-hidden="true">
      <div className="signal-mesh" />
      <div className="signal-stream stream-one" />
      <div className="signal-stream stream-two" />
      <div className="signal-stream stream-three" />
      <div className="signal-stream stream-four" />
    </div>
    <Button variant="outline" size="icon" className="ambient-control" onClick={() => setPaused(value => !value)} aria-pressed={paused} aria-label={paused ? 'Resume background animation' : 'Pause background animation'} title={paused ? 'Resume background animation' : 'Pause background animation'}>
      {paused ? <Play aria-hidden="true" /> : <Pause aria-hidden="true" />}
    </Button>
  </>;
}