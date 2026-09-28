import { useRef, useState } from 'react';
import { EXHIBITIONS } from '../model/index.js';
const stories = [
  {
    file: 'flat',
    title: '把航线留在墙上',
    text: '摄影与海报由方形节点夹持，留白让观看有自己的节奏。',
    parts: '平面展板 · 夹持节点 · 定向灯具',
  },
  {
    file: 'shelves',
    title: '让藏品拥有层次',
    text: '层板、浅托盘与透明展柜共同容纳沿途的器物和材料。',
    parts: '陈列层板 · 透明展柜 · 浅托盘',
  },
  {
    file: 'reading',
    title: '从观看，到翻阅',
    text: '倾斜书托把图录带到手边，同一套连接基础延伸出阅读空间。',
    parts: '倾斜书托 · 节点横杆 · 陈列层板',
  },
  {
    file: 'mixed',
    title: '一面墙，多种叙事',
    text: '图像、实物与书刊交织，模块随策展主题重新组合。',
    parts: '平面展板 · 透明展柜 · 书托 · 浅托盘',
  },
];
export function SceneGallery({ store }) {
  const [current, setCurrent] = useState(0),
    dialog = useRef(null);
  const useScene = (i) => {
    store.stopPlay();
    store.setExhibition(i);
    document
      .getElementById('planner')
      .scrollIntoView({
        behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
          ? 'auto'
          : 'smooth',
      });
  };
  return (
    <section
      id="scene-gallery"
      className="scene-gallery"
      aria-labelledby="gallery-heading"
      onKeyDown={(e) => e.stopPropagation()}
    >
      <div className="gallery-heading">
        <div>
          <div className="eyebrow">72+ / SPACES</div>
          <h2 id="gallery-heading">在邮轮中，体验墙面的无穷变化</h2>
        </div>
        <p>
          同一面墙，多种玩法；
          <br />
          从一个 48 mm 节点，延伸到完整空间。
        </p>
      </div>
      <div className="gallery-grid">
        {stories.map((s, i) => (
          <article className="gallery-story" key={s.file}>
            <button
              className="gallery-image"
              aria-label={'放大' + EXHIBITIONS[i].name + '场景效果图'}
              onClick={() => {
                setCurrent(i);
                dialog.current.showModal();
              }}
            >
              <img
                src={'/scenes/' + s.file + '.png'}
                loading={i === 0 ? 'eager' : 'lazy'}
                fetchPriority={i === 0 ? 'high' : 'auto'}
                decoding="async"
                alt={EXHIBITIONS[i].name + '：邮轮展陈空间中的蓝色方形节点与模块组合，概念效果图'}
              />
              <span>查看大图 ↗</span>
            </button>
            <div className="gallery-caption">
              <div>
                <span className="gallery-index">
                  0{i + 1} / {EXHIBITIONS[i].name}
                </span>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
                <small>{s.parts}</small>
              </div>
              <button data-gallery-use={i} onClick={() => useScene(i)}>
                搭建此场景 ↗
              </button>
            </div>
          </article>
        ))}
      </div>
      <p className="gallery-note">
        AI
        概念效果图，用于展示空间氛围与模块组合方向；陈设、数量和连接细节可能与配置器不同。尺寸、格位及结构关系以
        48 mm 三维模型为准。
      </p>
      <dialog
        className="gallery-dialog"
        ref={dialog}
        onClick={(e) => {
          if (e.target === e.currentTarget) e.currentTarget.close();
        }}
        aria-label="场景效果图大图"
      >
        <button
          className="gallery-close"
          onClick={() => dialog.current.close()}
          aria-label="关闭场景大图"
        >
          关闭 ✕
        </button>
        <img
          src={'/scenes/' + stories[current].file + '.png'}
          alt={EXHIBITIONS[current].name + '概念效果图'}
        />
        <div className="gallery-dialog-caption">
          <b>{EXHIBITIONS[current].name}</b>
          <span>概念效果图 · 48 mm 节点系统</span>
          <button
            onClick={() => {
              dialog.current.close();
              useScene(current);
            }}
          >
            搭建此场景 ↗
          </button>
        </div>
      </dialog>
    </section>
  );
}
