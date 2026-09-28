export function AboutDialog({ dialogRef }) {
  return (
    <dialog
      id="aboutModal"
      ref={dialogRef}
      onClick={(e) => {
        if (e.target === e.currentTarget) e.currentTarget.close();
      }}
    >
      <div className="modalhead">
        <h2>48 mm 节点，持续重组</h2>
        <button id="closeAbout" onClick={() => dialogRef.current.close()} aria-label="关闭说明">
          ✕
        </button>
      </div>
      <p className="version-record">
        当前：V4.5 文案更新版 · 2026.09.23
        <br />
        留底：V4.0 展陈系统版 / V4.1 产品画廊版 · 修改前完整源码已归档。
      </p>
      <p>
        以48
        mm立方节点为共同连接基础，组合横杆、承托件与展示面。展陈空间包含平面悬展、层架陈列、翻阅展示和混合策展；改变配置时保留可复用构件。
      </p>
      <p>
        以 V3 的正向梯柱和 48 mm
        方形节点为起点，将连接接口与功能机芯分开。模块保持统一的方形语言，但不同功能采用不同的承力与供电方式。
      </p>
      <div className="legendrow">
        <b>01 / 夹持</b>
        <span>平面展陈沿用四角夹持。导柱只用于调节厚度，不承担展柜的悬挑载荷。</span>
      </div>
      <div className="legendrow">
        <b>02 / 承托</b>
        <span>展柜、层板和活动台增加跨柱背架、上下挂点及独立防抬结构。</span>
      </div>
      <div className="legendrow">
        <b>03 / 功能</b>
        <span>灯具和香氛通过可换背板接入。低压供电走独立线槽，不默认梯柱或导柱可导电。</span>
      </div>
      <p>
        本版以 48 × 48 × 48 mm 为占位单元，XYZ 坐标为整数格。2900 mm 墙面内使用 2880 mm
        网格，四边各留 10 mm。深度共 24
        格。碰撞检查三维占位包络；柜门打开和活动台折叠预留活动空间，但不替代精细结构干涉检查。网格是新的设计规则，不是原梯柱的安装孔距。原
        714 mm 柱距及假定 25 mm 横档节距不能直接对齐 48 mm；需另开发横向适配背板 /
        二次承力框架。离墙叠放同样需要连接和承载验证。
      </p>
      <p>
        参考{' '}
        <a
          href="https://www.stringfurniture.com/en/design-assistance/string-planner?market=hk"
          target="_blank"
          rel="noopener"
          style={{ color: 'var(--blue)' }}
        >
          String Planner 的模块组合方式 ↗
        </a>
        ，本页为独立设计原型。
      </p>
    </dialog>
  );
}
