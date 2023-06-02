import { fetchCredentials } from "../../../../scripts/packages/tator-js/src/utils/fetch-credentials.js";

// Misc. Utilities for Tator

export class Utilities {
  static showSuccessIcon(message, color, noFade) {
    const el = window.tator_success_light;
    if (el) {
      if (noFade) {
        el.message(message, color);
      } else {
        el.fade_message(message, color);
      }
    } else {
      console.warn("Couldn't find tator_success_light element!");
    }
  }

  static hideSuccessIcon() {
    const el = window.tator_success_light;
    if (el) {
      el.hide();
    }
  }

  static warningAlert(message, color, noFade) {
    const el = window.tator_warning_light;
    if (el) {
      if (noFade) {
        el.message(message, color);
      } else {
        el.fade_message(message, color);
      }
    } else {
      console.warn("Couldn't find element!");
    }
  }

  static hideAlert() {
    const el = window.tator_warning_light;
    if (el) {
      el.hide();
    }
  }
  // Get the download request object
  static getDownloadInfo(media_element, session_headers) {
    // Download original file if available.
    let url;
    let http_authorization;
    let hostname;
    let path;
    let size;
    var media_files = media_element.media_files;
    const byRes = (a, b) => {
      return b.resolution[0] - a.resolution[0];
    };
    if (media_files) {
      if (media_files.layout) {
        return { request: null, size: -1 };
      }
      if (media_files.image) {
        media_files.image.sort(byRes);
        path = media_files.image[0].path;
        size = media_files.image[0].size;
        http_authorization = media_files.image[0].http_auth;
        hostname = media_files.image[0].host;
      } else if (media_files.archival) {
        media_files.archival.sort(byRes);
        path = media_files.archival[0].path;
        size = media_files.archival[0].size;
        http_authorization = media_files.archival[0].http_auth;
        hostname = media_files.archival[0].host;
      } else if (media_files.streaming) {
        media_files.streaming.sort(byRes);
        path = media_files.streaming[0].path;
        size = media_files.streaming[0].size;
        http_authorization = media_files.streaming[0].http_auth;
        hostname = media_files.streaming[0].host;
      } else {
        let fname = media_element.name;
        console.warn(`Can't find suitable download for ${fname}`);
      }
    } else {
      let fname = media_element.name;
      console.warn(`Can't find suitable download for ${fname}`);
    }

    let request = null;
    if (path) {
      if (path.startsWith("http")) {
        url = path;
        request = new Request(url, { method: "GET", credentials: "omit" });
      }
    }

    return { request: request, size: size };
  }

  // Returns a promise with the clients IP
  static getClientIP() {
    var promise = new Promise((resolve) => {
      fetch("https://jsonip.com")
        .then((response) => {
          return response.json();
        })
        .then((json) => {
          resolve(json["ip"]);
        });
    });
    return promise;
  }

  // Send a notifiation to admins
  static sendNotification(msg, sendAsFile) {
    let request_body = { message: msg };
    if (sendAsFile == true) {
      request_body["send_as_file"] = 1;
    }
    return fetchCredentials("/rest/Notify", {
      method: "POST",
      body: JSON.stringify(request_body),
    });
  }

  static errorPageFunction(code) {
    Utilities.getClientIP().then((ip) => {
      var message = `Error ${code} from ${ip}`;
      Utilities.sendNotification(message);
    });
  }
}
