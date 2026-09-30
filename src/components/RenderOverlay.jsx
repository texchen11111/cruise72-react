import { useEffect, useRef, useState } from 'react';

const scenes = [
  { file: 'flat', name: '平面悬展', title: '把航线留在墙上' },
  { file: 'shelves', name: '层架陈列', title: '让藏品拥有层次' },
  { file: 'reading', name: '阅读角落', title: '从观看，到翻阅' },
  { file: 'mixed', name: '混合策展', title: '一面墙，多种叙事' },
];

export function RenderOverlay({ onClose }) {
  const dialog = useRef(null);
  const [current, setCurrent] = useState(0);
  const [failed, setFailed] = useState(false);
  const scene = scenes[current];
  useEffect(() => {
    const previous = document.activeElement;
    dialog.current.showModal();
    return () => previous?.focus();
  }, []);
  useEffect(() => setFailed(false), [current]);
  const step = (delta) =>
    setCurrent((value) => (value + delta + scenes.length) % scenes.length);
  return (
    <dialog
      ref={dialog}
      className="render-overlay"
      aria-labelledby="render-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      onKeyDown={(event) => {
        event.stopPropagation();
        if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
          event.preventDefault();
          step(event.key === 'ArrowLeft' ? -1 : 1);
        }
      }}
    >
      <div className="render-frame">
        <div className="render-heading">
          <div>
            <span className="panel-eyebrow">72+ / SCENE ATLAS</span>
            <h2 id="render-title">{scene.title}</h2>
          </div>
          <button className="render-close" onClick={onClose} autoFocus>
            返回配置器 ×
          </button>
        </div>
        <div className="render-image">
          {failed ? (
            <p role="status">这张效果图暂时无法加载，请切换其他场景。</p>
          ) : (
            <img
              key={scene.file}
              src={'/scenes/' + scene.file + '.png'}
              alt={scene.name + '概念效果图'}
              onError={() => setFailed(true)}
            />
          )}
          <button
            className="render-prev"
            aria-label="上一张效果图"
            onClick={() => step(-1)}
          >
            ←
          </button>
          <button
            className="render-next"
            aria-label="下一张效果图"
            onClick={() => step(1)}
          >
            →
          </button>
          <span className="render-counter">0{current + 1} / 04</span>
        </div>
        <div className="render-footer">
          <div
            className="render-thumbnails"
            role="group"
            aria-label="选择场景效果图"
          >
            {scenes.map((item, index) => (
              <button
                key={item.file}
                aria-pressed={index === current}
                aria-label={'查看' + item.name + '效果图'}
                onClick={() => setCurrent(index)}
              >
                <img
                  src={'/scenes/' + item.file + '.png'}
                  alt=""
                  loading="lazy"
                />
                <span>{item.name}</span>
              </button>
            ))}
          </div>
          <p>
            AI 概念效果图 · 展示空间氛围
            <br />
            浏览图片不会改变当前方案
          </p>
        </div>
      </div>
    </dialog>
  );
}
