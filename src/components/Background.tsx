/* Capas de fondo synthwave (versión ligera del home de nayer.dev) */
export function Background({ calm = false }: { calm?: boolean }) {
  return (
    <>
      <div className={`bg-stack${calm ? ' bg-stack--calm' : ''}`} aria-hidden="true">
        <div className="bg" />
        <div className="aurora">
          <span />
          <span />
          <span />
        </div>
        <div className="grid-floor" />
        <div className="horizon" />
        <div className="vignette" />
      </div>
      <div className="scanlines" aria-hidden="true" />
    </>
  );
}
