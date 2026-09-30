import { useEffect, useRef, useState } from 'react';

function RailIcon({ name }) {
  const paths = {
    modules: 'M3 3h6v6H3z M15 3h6v6h-6z M3 15h6v6H3z M15 15h6v6h-6z',
    scenes: 'M3 4h18v16H3z M3 15l5-5 5 5 3-3 5 5 M16 7h1',
    settings:
      'M3 6h5m4 0h9 M3 12h11m4 0h3 M3 18h3m4 0h11 M8 3v6 M14 9v6 M6 15v6',
    guide: 'M12 17v-5 M12 7v1 M12 2a10 10 0 1 0 0 20a10 10 0 1 0 0-20',
  };
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name]} />
    </svg>
  );
}

// Keep panel contents mounted so collapsing the UI never resets an edit or the scene.
export function HoverPanel({
  id,
  label,
  title,
  icon,
  side = 'left',
  activePanel,
  onActivePanel,
  children,
}) {
  const [pinned, setPinned] = useState(false);
  const root = useRef(null);
  const trigger = useRef(null);
  const timer = useRef(null);
  const suppressFocus = useRef(false);
  const open = activePanel === id;
  const cancelClose = () => clearTimeout(timer.current);
  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(() => {
    if (!open) setPinned(false);
  }, [open]);

  const close = () => {
    cancelClose();
    setPinned(false);
    onActivePanel(null);
    if (root.current?.contains(document.activeElement)) {
      suppressFocus.current = true;
      trigger.current?.focus();
      suppressFocus.current = false;
    }
  };
  const scheduleClose = () => {
    cancelClose();
    timer.current = setTimeout(() => {
      const focus = document.activeElement;
      const editing =
        focus !== trigger.current && root.current?.contains(focus);
      if (!pinned && !editing)
        onActivePanel((current) => (current === id ? null : current));
    }, 220);
  };
  return (
    <div
      className={'hover-panel panel-' + side}
      ref={root}
      onPointerEnter={(event) => {
        if (event.pointerType === 'touch') return;
        cancelClose();
        onActivePanel(id);
      }}
      onPointerLeave={scheduleClose}
      onFocusCapture={() => {
        if (suppressFocus.current) return;
        cancelClose();
        onActivePanel(id);
      }}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) scheduleClose();
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          event.stopPropagation();
          close();
        }
      }}
      onDragStart={() => {
        // Allow the browser to capture the dragged card before hiding its panel.
        cancelClose();
        timer.current = setTimeout(() => {
          setPinned(false);
          onActivePanel((current) => (current === id ? null : current));
        }, 100);
      }}
    >
      <button
        ref={trigger}
        className={'rail-trigger' + (open ? ' is-active' : '')}
        aria-label={title}
        aria-expanded={open}
        aria-controls={id + '-panel'}
        title="悬停展开 · 点击固定"
        onClick={() => {
          if (open && pinned) close();
          else {
            setPinned(true);
            onActivePanel(id);
          }
        }}
      >
        <RailIcon name={icon} />
        <span>{label}</span>
      </button>
      <section
        id={id + '-panel'}
        className="floating-panel"
        aria-label={title}
        hidden={!open}
      >
        <div className="floating-panel-heading">
          <div>
            <span className="panel-eyebrow">72+ / WORKSPACE</span>
            <h2>{title}</h2>
          </div>
          <div className="panel-actions">
            <button
              className="panel-pin"
              aria-pressed={pinned}
              onClick={() => setPinned(!pinned)}
              title="固定面板后，移开鼠标也不会收起"
            >
              {pinned ? '已固定' : '固定'}
            </button>
            <button aria-label={'收起' + title} onClick={close}>
              ×
            </button>
          </div>
        </div>
        <div className="floating-panel-body">{children}</div>
      </section>
    </div>
  );
}
