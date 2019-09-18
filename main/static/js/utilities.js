// Misc. Utilities for Tator

function getCookie(name) {
  let value = "; " + document.cookie;
  let parts = value.split("; " + name + "=");
  if (parts.length == 2) {
    return parts.pop().split(";").shift();
  }
}

class Utilities
{
  // Returns a promise with the clients IP
  static getClientIP()
  {
    var promise = new Promise((resolve) => {
      fetch('https://jsonip.com').then((response) => {
        return response.json();
      }).then((json) => {
        resolve(json['ip']);
      });
    });
    return promise;
  }

  // Send a notifiation to admins
  static sendNotification(msg)
  {
    return fetch("/rest/Notify",
                 {method: "POST",
                  body: JSON.stringify({"message": msg}),
                  credentials: "same-origin",
                  headers: {
                    "X-CSRFToken": getCookie("csrftoken"),
                    "Accept": "application/json",
                    "Content-Type": "application/json"
                  }
                 });
  }

  static errorPageFunction(code)
  {
    Utilities.getClientIP().then((ip) => {
      var message=`Error ${code} from ${ip}`;
      Utilities.sendNotification(message);
    });
  }
}
