import "./kumo-loading.css";

type KumoLoadingProps = { label?: string };

export default function KumoLoading({ label = "Bringing Japan a little closer..." }: KumoLoadingProps) {
  return (
    <div className="kumo-loading" role="status" aria-live="polite" aria-busy="true">
      <div className="kumo-loading-content">
        <div className="kumo-loading-emblem" aria-hidden="true">
          <span className="kumo-loading-orbit" />
          <span className="kumo-loading-stamp">雲</span>
          <span className="kumo-loading-spark" />
        </div>
        <strong className="kumo-loading-wordmark" aria-hidden="true">kumo<span>.</span></strong>
        <span className="kumo-loading-tagline" aria-hidden="true">JAPAN, A LITTLE CLOSER.</span>
        <span className="kumo-loading-track" aria-hidden="true"><span /></span>
        <span className="kumo-loading-label">{label}</span>
      </div>
      <span className="kumo-loading-footnote" aria-hidden="true">LITTLE FINDS. EVERYDAY JOY.</span>
    </div>
  );
}
