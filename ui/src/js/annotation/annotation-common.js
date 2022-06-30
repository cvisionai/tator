export function handle_video_error(evt, root)
{
  let msg_html = "";
  let errorType = null;

  if (evt.detail.secureContext == false) {
    errorType = "secureContext";
    const tator_link=`<span class='text-gray'><a class='nav__link' target='_new' href='https://www.tator.io/docs/administrator-guide/configuration/enable-https'>enable a secure context using TLS</a></span>`;
    const tutorial_link=`<span class='text-gray'><a class='nav__link' target='_new' href='https://www.tator.io/blog/secure-context-for-local-deployments'>secure origin</a></span>`;
    msg_html += "<div class='nav__secondary'>";
    msg_html += `Your connection to <span class='text-purple'>${window.location.host}</span> is not secure context.<br>In this state, components required by Tator are disabled by your browser security settings.`
    msg_html += `<br><br>To proceed, add <span class='text-purple'>${window.location.host}</span> as a ${tutorial_link}`; 
    msg_html += ` or contact your system administrator to ${tator_link} to your Tator deployment.`;
    msg_html += "</div>"
  } else if (evt.detail.videoDecoderPresent == false) {
    errorType = "videoDecoderPresent";
    const edge_link=`<span class='text-gray'><a class='nav__link' target='_new' href='https://www.microsoft.com/en-us/edge'>Microsoft Edge</a></span>`;
    const chrome_link=`<span class='text-gray'><a class='nav__link' target='_new' href='https://www.google.com/chrome/'>Google Chrome</a></span>`;
    msg_html += "<div class='nav__secondary'>";
    msg_html += `Your browser does not support WebCodecs API.`
    msg_html += `<br>Please utilize the latest versions of ${chrome_link} or ${edge_link}.`;
    msg_html += "</div>";
  }

  const sessionValue = sessionStorage.getItem(`handle_error__${errorType}`);
  if (sessionValue && sessionValue === 'true') {
    console.error("Supressed System Incompatibility Warning: "+errorType);
    return;
  } else {
    let modalError = document.createElement("modal-notify");
    root.appendChild(modalError);
    modalError.init("System Incompatibility Warning", msg_html, 'error', 'Exit', true);
    modalError.setAttribute("is-open", "");
    sessionStorage.setItem(`handle_error__${errorType}`, 'true');
  }
}

// Class to handle the repetitive nature of graying out / disabling the play button
export class PlayInteraction
{
  constructor(parent)
  {
    this._parent = parent;
  }
  enable()
  {
    this._parent._play._button.removeAttribute("disabled");
    this._parent._rewind.removeAttribute("disabled")
    this._parent._fastForward.removeAttribute("disabled");
    this._parent._play.removeAttribute("tooltip");
  }
  disable()
  {
    // Disable buttons when actively seeking
    this._parent._play._button.setAttribute("disabled","");
    // Use some spaces because the tooltip z-index is wrong
    this._parent._play.setAttribute("tooltip", "    Video is buffering");
    this._parent._rewind.setAttribute("disabled","")
    this._parent._fastForward.setAttribute("disabled","");
  }
}