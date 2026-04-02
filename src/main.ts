import './style.css'
import FramerMasonry from './FramerMasonry'

document.querySelector<HTMLDivElement>('#app')!.innerHTML = ''

const container = document.querySelector<HTMLDivElement>('#app')

if (container) {
  const root = document.createElement('div')
  container.appendChild(root)
  // Render React component via simple mount
  // (For a minimal setup without JSX/ReactDOM imports in this entry file)
  ;(async () => {
    const React = await import('react')
    const ReactDOM = await import('react-dom/client')
    const rootInstance = ReactDOM.createRoot(root)
    rootInstance.render(
      React.createElement(React.StrictMode, null, React.createElement(FramerMasonry)),
    )
  })()
}
