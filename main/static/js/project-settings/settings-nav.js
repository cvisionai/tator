class SettingsNav extends TatorElement {
  constructor() {
    super();

    //this.nav = document.createElement("div");
    //this.nav.setAttribute("class", "project__overview col-3 px-4 rounded-2");

    this.nav = document.createElement("nav");
    this.nav.setAttribute("class", "SideNav rounded-2 col-3");
    this.nav.style.float = "left";

    this.addItem({
      "name":"Project",
      "type":"project",
      "linkData":"#projectMain"
    });

    this.mediaDom = "";

    this._shadow.appendChild(this.nav);
  }

  addItem({name = "Default", type = "project", subItems = {}, mediaId = -1, linkData = "#"} = {} ){
    //let item = document.createElement("h3");
    //item.setAttribute("class", "py-3 lh-condensed text-semibold");

    let item = document.createElement("a");
    item.setAttribute("class", "SideNav-item ");
    item.href = linkData;
    item.title = type.replace(/[^a-zA-Z0-9]+(.)/g, (m, chr) => chr.toUpperCase());
    if(linkData == '#projectMain') {
      item.setAttribute("selected", "true");
    } else {
      item.setAttribute("selected", "false");
    }

    //if(linkData == "#projectMain") item.setAttribute("aria-selected", "true");

    item.innerHTML = this.getLinkText({"type":type, "text": name});

    item.addEventListener("click", (event) => {
      event.preventDefault();

      if (event.target.tagName === 'A') {
        this._shadow.querySelector('a[selected="true"]').setAttribute("selected", "false");
        item.setAttribute("selected", "true");
      }

      this.toggleItem(linkData);
    });


    // SubItems
    /*if (subItems.length > 0){
      for(let obj of subItems){
        let subNav = document.createElement("a");
        item.setAttribute("class", "SideNav-item");
        subNav.style.paddingLeft = "44px";

        let subItem = this.getSubItem(obj, mediaId);
        subNav.innerHTML = subItem;

        item.appendChild(subNav);
      }
    }*/

    return this.nav.appendChild(item);
  }

  getSubItem(obj,mediaId){
    let subItem = document.createElement("a");
    subItem.setAttribute("class", "SideNav");
    subItem.href = "#";
    subItem.title = "obj.name"
    return this.getLinkText({ "text" : obj.name, "count": obj.count});
  }

  getLinkText({type = "", count = 0, text = ""} = {}){
    let icon = "";
    switch(type){
      case "project" :
        icon = this.projectIconSvg();
        break;
      case "video" :
        icon = this.videoIconSvg();
        break;
      case "image" :
        icon = this.imageIconSvg();
        break;
      case "multi" :
        icon = this.multiIconSvg();
        break;
    }

    return `${icon} <span class="item-label">${text} ${this.getAttributeLabel(count)}</span>`;
  }

  videoIconSvg(){
    return '<svg class="SideNav-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M15.2 2.09L10 5.72V3c0-.55-.45-1-1-1H1c-.55 0-1 .45-1 1v9c0 .55.45 1 1 1h8c.55 0 1-.45 1-1V9.28l5.2 3.63c.33.23.8 0 .8-.41v-10c0-.41-.47-.64-.8-.41z"/></svg>';
  }

  imageIconSvg(){
    return '<svg class="SideNav-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M15 3H7c0-.55-.45-1-1-1H2c-.55 0-1 .45-1 1-.55 0-1 .45-1 1v9c0 .55.45 1 1 1h14c.55 0 1-.45 1-1V4c0-.55-.45-1-1-1zM6 5H2V4h4v1zm4.5 7C8.56 12 7 10.44 7 8.5S8.56 5 10.5 5 14 6.56 14 8.5 12.44 12 10.5 12zM13 8.5c0 1.38-1.13 2.5-2.5 2.5S8 9.87 8 8.5 9.13 6 10.5 6 13 7.13 13 8.5z"/></svg>';
  }

  multiIconSvg(){
    return '<svg class="SideNav-icon" xmlns="http://www.w3.org/2000/svg" width="12" height="16" viewBox="0 0 12 16"><path fill-rule="evenodd" d="M6 5h2v2H6V5zm6-.5V14c0 .55-.45 1-1 1H1c-.55 0-1-.45-1-1V2c0-.55.45-1 1-1h7.5L12 4.5zM11 5L8 2H1v11l3-5 2 4 2-2 3 3V5z"/></svg>';
  }

  projectIconSvg(){
    return '<svg class="SideNav-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16"><path fill-rule="evenodd" d="M1.75 0A1.75 1.75 0 000 1.75v12.5C0 15.216.784 16 1.75 16h12.5A1.75 1.75 0 0016 14.25V1.75A1.75 1.75 0 0014.25 0H1.75zM1.5 1.75a.25.25 0 01.25-.25h12.5a.25.25 0 01.25.25v12.5a.25.25 0 01-.25.25H1.75a.25.25 0 01-.25-.25V1.75zM11.75 3a.75.75 0 00-.75.75v7.5a.75.75 0 001.5 0v-7.5a.75.75 0 00-.75-.75zm-8.25.75a.75.75 0 011.5 0v5.5a.75.75 0 01-1.5 0v-5.5zM8 3a.75.75 0 00-.75.75v3.5a.75.75 0 001.5 0v-3.5A.75.75 0 008 3z"></path></svg>';
  }

  getAttributeLabel(count){
    if(count === 0) return "";
    return `<span class="Label">${count} Attributes</span>`;
  }

  /* Get personlized information when we have project-id, and fill page. */
  static get observedAttributes() {
    return ["_data"].concat(TatorPage.observedAttributes);
  }
  attributeChangedCallback(name, oldValue, newValue) {
    TatorPage.prototype.attributeChangedCallback.call(this, name, oldValue, newValue);
    switch (name) {
      case "_data":
        this._init();
        break;
    }
  };

  toggleItem(linkData){
    let targetEl = this.mediaDom.querySelector(linkData) ||  this.projectDom.querySelector(linkData);

    this.mediaDom.querySelectorAll('.item-box').forEach( (el) => {
      if ( el != targetEl ) {
        el.hidden = true;
      }
    } );

    this.projectDom.querySelectorAll('.item-box').forEach( (el) => {
      if ( el != targetEl ) {
        el.hidden = true;
      }
    } );

    return targetEl.hidden = false;
  };

  setMediaDom ( ref ){
    return this.mediaDom = ref;
  }
  setProjectDom( ref ){
    return this.projectDom = ref;
  }

  _init(){
    console.log("Settings Nav - Init");

    this.data = JSON.parse( this.getAttribute("_data") );

    for(let i in this.data){
      this.addItem({
        "type":this.data[i].dtype,
        "linkData":"#mediaId-"+this.data[i].id,
        "name": this.data[i].name
      });
    }
  }

}

customElements.define("settings-nav", SettingsNav);
