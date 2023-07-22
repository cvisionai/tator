import { TatorElement } from "./tator-element.js";
import { fetchCredentials } from "../../../../scripts/packages/tator-js/src/utils/fetch-credentials.js";

export class UserData extends TatorElement {
  constructor() {
    super();

    // Map of user ID to user objects.
    this._users = new Map();
  }

  findUsers(usernames) {
    // Searches for a list of users. Users that are found successfully are appended
    // to the internal user list. The internal list and users who were not found
    // are emitted in a custom event.
    let missing = [];
    for (const username of usernames) {
      let promise;
      if (username.indexOf("@") > -1) {
        // This is an email address.
        promise = fetchCredentials(`/rest/Users?email=${username}`);
      } else {
        // This is a username.
        promise = fetchCredentials(`/rest/Users?username=${username}`);
      }
      promise
        .then((response) => response.json())
        .then((users) => {
          if (users.length > 0) {
            for (const user of users) {
              this._users.set(user.id, user);
            }
          } else {
            missing.push(username);
          }
          // Emit current list of users and usernames that could not be found.
          this.dispatchEvent(
            new CustomEvent("users", {
              detail: { users: this.getUsers(), missing: missing },
            })
          );
        });
    }
  }

  getUsers() {
    //Returns users.
    return this._users;
  }

  async getCurrentUser() {
    let resp = await fetchCredentials("/rest/User/GetCurrent");
    let data = resp.json();
    return data;
  }

  async getUserById(id) {
    let resp = await fetchCredentials("/rest/User/" + id);
    let data = resp.json();
    return data;
  }

  removeUser(userId) {
    // Removes a user by user ID and emits updated list of users.
    this._users.delete(userId);
    this.dispatchEvent(
      new CustomEvent("users", {
        detail: { users: this.getUsers() },
      })
    );
  }

  reset() {
    this._users.clear();
    this.dispatchEvent(
      new CustomEvent("users", {
        detail: { users: this.getUsers() },
      })
    );
  }
}
customElements.define("user-data", UserData);
