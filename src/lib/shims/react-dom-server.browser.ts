import {
  renderToReadableStream,
  renderToStaticMarkup,
  renderToString,
} from 'react-dom/server.browser'

function unsupportedPipeableApi() {
  throw new Error('renderToPipeableStream is not available in browser runtime')
}

const ReactDOMServer = {
  renderToReadableStream,
  renderToStaticMarkup,
  renderToString,
  resume: unsupportedPipeableApi,
  renderToPipeableStream: unsupportedPipeableApi,
  resumeToPipeableStream: unsupportedPipeableApi,
}

export {
  renderToReadableStream,
  renderToStaticMarkup,
  renderToString,
}

export const renderToPipeableStream = unsupportedPipeableApi
export const resume = unsupportedPipeableApi
export const resumeToPipeableStream = unsupportedPipeableApi

export default ReactDOMServer
