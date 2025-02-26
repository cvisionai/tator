export function handle_video_error(evt, root) {
  let msg_html = "";
  let errorType = "";
  let exit = false;

  if (evt.detail.secureContext == false) {
    errorType = "secureContext";
    const tator_link = `<span class='text-gray'><a class='nav__link' target='_new' href='https://www.tator.io/docs/administrator-guide/configuration/enable-https'>enable a secure context using TLS</a></span>`;
    const tutorial_link = `<span class='text-gray'><a class='nav__link' target='_new' href='https://www.tator.io/blog/secure-context-for-local-deployments'>secure origin</a></span>`;
    msg_html += "<span class='text-normal' style='line-height:1.7rem'>";
    msg_html += `<span class='text-semibold'>Your connection to <span class='text-purple'>${window.location.host}</span> is not secure context.</span><br>In this state, components required by Tator are disabled by your browser security settings.`;
    msg_html += `<br><br/>To proceed, add <span class='text-purple'>${window.location.host}</span> as a ${tutorial_link}`;
    msg_html += ` or contact your system administrator to ${tator_link} to your Tator deployment.`;
    msg_html += "</span>";
  } else if (evt.detail.videoDecoderPresent == false) {
    errorType = "videoDecoderPresent";
    const edge_link = `<span class='text-gray'><a class='nav__link' target='_new' href='https://www.microsoft.com/en-us/edge'>Microsoft Edge</a></span>`;
    const chrome_link = `<span class='text-gray'><a class='nav__link' target='_new' href='https://www.google.com/chrome/'>Google Chrome</a></span>`;
    msg_html += "<span class='text-normal' style='line-height:1.7rem'>";
    msg_html += `Your browser does not support WebCodecs API.`;
    msg_html += `<br>For full feature support, please utilize the latest versions of<br/>${chrome_link} or ${edge_link}.`;
    msg_html += "</span>";
  } else if (evt.detail.hasOffScreenCanvas == false) {
    errorType = "hasOffScreenCanvas";
    const edge_link = `<span class='text-gray'><a class='nav__link' target='_new' href='https://www.microsoft.com/en-us/edge'>Microsoft Edge</a></span>`;
    const chrome_link = `<span class='text-gray'><a class='nav__link' target='_new' href='https://www.google.com/chrome/'>Google Chrome</a></span>`;
    msg_html += "<span class='text-normal' style='line-height:1.7rem'>";
    msg_html += `You are using an unsupported browser.`;
    msg_html += `<br>For full feature support, please utilize the latest versions of<br/>${chrome_link} or ${edge_link}.`;
    msg_html += "</span>";
    sessionStorage.setItem(`handle_error__browser-support`, "true");
  } else if (evt.detail.forceCompat == 1) {
    errorType = "videoDecoderPresent";
    msg_html += "<span class='text-normal' style='line-height:1.7rem'>";
    msg_html += `Compatibility mode is enabled. `;
    msg_html += `<br>Not all video playback features will work optimally when bypassing the VideoDecoder API.`;
    msg_html += "</span>";
  } else {
    exit = true;
  }
  if (exit == true) {
    return;
  }

  const secureContextShown = sessionStorage.getItem(
    `handle_error__secureContext_${document.location.pathname}`
  );
  const videoDecoderPresentShown = sessionStorage.getItem(
    `handle_error__videoDecoderPresent_${document.location.pathname}`
  );
  const hasOffScreenCanvasShown = sessionStorage.getItem(
    `handle_error__hasOffScreenCanvas_${document.location.pathname}`
  );
  const browserSupportShownThisPage = sessionStorage.getItem(
    `handle_error__browser-support_${document.location.pathname}`
  );

  // Don't show offscreen if we have secure context or decoder errors on this page
  if (
    errorType == "hasOffScreenCanvas" &&
    (secureContextShown != null ||
      videoDecoderPresentShown != null ||
      browserSupportShownThisPage != null)
  )
    return;

  // Don't show decoder error if we have secure context error being shown on this page, or if we already told them on this page to get chrome/edge
  if (
    errorType == "videoDecoderPresent" &&
    (secureContextShown != null || browserSupportShownThisPage != null)
  )
    return;

  let modalError = document.createElement("modal-notify");
  root.appendChild(modalError);
  modalError.init(
    "System Incompatibility Warning",
    msg_html,
    "error",
    "Exit",
    true
  );
  modalError.setAttribute("is-open", "");
  sessionStorage.setItem(
    `handle_error__${errorType}_${document.location.pathname}`,
    "true"
  );
}

export function handle_decoder_error(evt, root) {
  let msg_html = "";
  let errorType = "";

  const edge_link = `<span class='text-gray'><a class='nav__link' target='_new' href='https://apps.microsoft.com/store/detail/av1-video-extension/9MVZQVXJBQ9V?hl=en-us&gl=US'>Microsoft Edge</a></span>`;
  const chrome_link = `<span class='text-gray'><a class='nav__link' target='_new' href='https://www.google.com/chrome/'>Google Chrome</a></span>`;
  msg_html += "<span class='text-normal' style='line-height:1.7rem'>";
  msg_html += `Your browser does not support the codec required by this video "${evt.detail.codec}"`;
  if (evt.detail.codec.indexOf("av01") >= 0) {
    msg_html += `<br>To resolve this please utilize ${chrome_link} or install the appropriate plug-in for ${edge_link}.`;
  }
  msg_html += "</span>";
  let modalError = document.createElement("modal-notify");
  root.appendChild(modalError);
  modalError.init(
    "System Incompatibility Warning",
    msg_html,
    "error",
    "Exit",
    true
  );
  modalError.setAttribute("is-open", "");
  sessionStorage.setItem(
    `handle_error__${errorType}_${document.location.pathname}`,
    "true"
  );
}

/**
 * Gets the date associated with the start of the provided Tator.Media object.
 * @param {Tator.Media} media - Media to process.
 *                              The media name should have the datetime string in isoformat.
 *                              ":" can be "_" instead for the hh:mm:ss portion.
 *                              The media name can have ID_ prefix that will be trimmed off.
 *                              If no timezone is explicitly provided, the datetime is assumed to
 *                              be UTC.
 * @returns {Date} Date object associated with the provided media start. If the media does not
 *                 have start time information, the returned object is null.
 */
export function getMediaStartDatetime(media) {
  let name = media.name;

  // Trim off ID if it is there
  if (name[1] == "_") {
    name = name.substr(2);
  }

  // Apply timezone if it's not there.
  let startTime8601 = name
    .substr(0, name.lastIndexOf("."))
    .replaceAll("_", ":");
  let timeZoneIncluded =
    startTime8601.lastIndexOf("-") > 7 || startTime8601[-1] == "Z";
  if (timeZoneIncluded != true) {
    startTime8601 += "-00:00"; // Assume zulu time
  }

  const userKeyRegExp =
    /^([0-9]{4}-[0-9]{2}-[0-9]{2}.[0-9]{2}.[0-9]{2}.[0-9]{2}.+)$/;
  const valid = userKeyRegExp.test(startTime8601);
  if (!valid) {
    return null;
  }

  // Return either null or corresponding Date object
  var datetime = new Date(startTime8601);
  if (datetime == "Invalid Date") {
    return null;
  } else {
    return datetime;
  }
}

export function frameToTime(frame, fps) {
  const totalSeconds = frame / fps;
  const seconds = Math.floor(totalSeconds % 60);
  const secFormatted = ("0" + seconds).slice(-2);
  const minutes = Math.floor(totalSeconds / 60);
  if (minutes < 60) {
    return minutes + ":" + secFormatted;
  } else {
    let hours = Math.floor(minutes / 60);
    const minFormatted = ("0" + Math.floor(minutes % 60)).slice(-2);
    return hours + ":" + minFormatted + ":" + secFormatted;
  }
}

// Given a player (multi or single) handle controls management based on whether we are playing
export function playerControlManagement(player, isPlaying) {
  let elements = [
    player._frameNext,
    player._framePrev,
    player._currentFrameText,
    player._currentTimeText,
    player._currentTimeInput,
    player._currentFrameInput,
    player._slider,
  ];

  for (let element of elements) {
    if (isPlaying) {
      element.setAttribute("disabled", "");
    } else {
      element.removeAttribute("disabled");
    }
  }
}

// Class to handle the repetitive nature of graying out / disabling the play button
export class PlayInteraction {
  constructor(parent) {
    this._parent = parent;
  }
  enable() {
    this._parent._play._button.removeAttribute("disabled");
    this._parent._rewind.removeAttribute("disabled");
    this._parent._fastForward.removeAttribute("disabled");
    this._parent._play.removeAttribute("tooltip");
  }
  disable() {
    if (this._parent._videoStatus == "playing")
    {
      console.warn("Defensively ignoring request to disable pause button");
      return;
    }
    // Disable buttons when actively seeking
    this._parent._play._button.setAttribute("disabled", "");
    // Use some spaces because the tooltip z-index is wrong
    this._parent._play.setAttribute("tooltip", "    Video is buffering");
    this._parent._rewind.setAttribute("disabled", "");
    this._parent._fastForward.setAttribute("disabled", "");
  }
}
