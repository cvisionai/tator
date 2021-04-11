class SettingsNav extends TatorElement {
  constructor() {
    super();

    // Panels holder
    this.div = document.createElement("div");
    this.div.setAttribute("class", "py-6 clearfix position-relative px-md-6");
    this._shadow.appendChild(this.div);

    // Left navigation structure
    this.nav = document.createElement("nav");
    this.nav.setAttribute("class", "SideNav rounded-2 float-left col-xl-2 col-md-3 col-xs-12");
    this.div.appendChild(this.nav);

    // Right side panel with contents
    this.itemsContainer = document.createElement("div");
    this.itemsContainer.setAttribute("class", "NavItem float-left col-md-9 col-xl-10 col-xs-12");
    this.div.appendChild(this.itemsContainer);

    // Listen for changes
    this.addEventListener('settings-nav-new', this.newNavItem.bind(this));
    this.addEventListener('settings-nav-rename', this.updateNavItem.bind(this))
    this.addEventListener('settings-nav-remove', this.deleteNavItem.bind(this))
  }

  newItemEvent(typeId, typeName, newName){
    let detail = {
      "bubbles" : true,
      "detail" : {
        "typeId" : typeId,
        "typeName" : typeName,
        "newName" : newName
      }
    };
    return new CustomEvent('settings-nav-new', detail);
  }

  renameItemEvent(typeId, typeName, newName){
    let detail = {
      "bubbles" : true,
      "detail" : {
        "typeId" : typeId,
        "typeName" : typeName,
        "newName" : newName
      }
    };
    return new CustomEvent('settings-nav-rename', detail);
  }

  removeItemEvent(typeId, typeName){
    let detail = {
      "bubbles" : true,
      "detail" : {
        "typeId" : typeId,
        "typeName" : typeName
      }
    };
    return new CustomEvent('settings-nav-remove', detail);
  }

  newNavItem(e){  
    // Create the link.
    let obj = {
      "id" : e.detail.typeId,
      "name" : e.detail.newName
    }
    let itemSelector = `#itemDivId-${e.detail.typeName}-${e.detail.typeId}`;
    let subNavLink = this.getSubItem(obj, e.detail.typeName, itemSelector);
    
    // Find the end of the type's section.
    let addNewNode = this._shadow.querySelector(`a[href='#itemDivId-${e.detail.typeName}-New']`);
    //let parentNode = addNewNode.parentNode;
    addNewNode.before(subNavLink);

    return subNavLink.click();
  }

  updateNavItem(e){
    let navItem = this._shadow.querySelector(`a[href='#itemDivId-${e.detail.typeName}-${e.detail.typeId}']`);
    return navItem.innerHTML = e.detail.newName;
  }

  deleteNavItem(e){
    // Delete the side nav item, and container
    let navItem = this._shadow.querySelector(`a[href='#itemDivId-${e.detail.typeName}-${e.detail.typeId}']`);
    let container = this._shadow.getElementById(`itemDivId-${e.detail.typeName}-${e.detail.typeId}`);

    navItem.parentNode.firstChild.click();
    container.remove();

    // Show something else...
    return navItem.remove();
  }


  _addNav({name, type, subItems}){
    return this._addHeadingWithSubItems({
      name,
      type,
      subItems
    });
  }

  _addSimpleNav({name, type, id, selected}){
    return this._addNavItem({
      name,
      type,
      "linkData": `#itemDivId-${type}-${id}`,
      selected
    });
  }

  //
  _addNavItem({name = "Default", type = "project", linkData = "#", selected = false} = {} ){
    let item = document.createElement("a");
    item.setAttribute("class", "SideNav-item ");
    item.href = linkData;
    item.title = type.replace(/[^a-zA-Z0-9]+(.)/g, (m, chr) => chr.toUpperCase());

    if(selected) {
      item.setAttribute("selected", "true");
      this.toggleItemContainer({ "itemIdSelector":linkData});
    } else {
      item.setAttribute("selected", "false");
    }

    item.innerHTML = name;

    item.addEventListener("click", (event) => {
      event.preventDefault();

      let selectedItems = this._shadow.querySelectorAll('[selected="true"]');
      for(let el of selectedItems){
        el.setAttribute("selected", "false");
      }
      event.target.setAttribute("selected", "true");

      this.toggleItemContainer({ "itemIdSelector":linkData});
    });

    return this.nav.appendChild(item);
  }

  // Creates a clickable heading that expands to show clickable subitem lisr
  _addHeadingWithSubItems({
    name = document.createElement(""), 
    type = "", 
    subItems = []
  } = {} ){
    let headingBox = document.createElement("div");
    headingBox.setAttribute("class", `SideNav-heading f1 clearfix heading-for-${type}`); // ie. video,image,multi,localization,leaf,state

    // Heading button
    let itemHeading = document.createElement("button");
    itemHeading.setAttribute("class", `toggle-subitems-${type}`); // ie. video,image,multi,localization,leaf,state
    itemHeading.appendChild(name);
    itemHeading.setAttribute("selected", "false");
    headingBox.appendChild(itemHeading);
     
    // SubItems holder
    let hiddenSubNav = document.createElement("nav");
    hiddenSubNav.setAttribute("class", `SideNav SubItems  subitems-${type}`);
    hiddenSubNav.hidden = true;

    // Group the above
    let navGroup = document.createElement("div");
    navGroup.setAttribute("class", "SubNav")
    navGroup.appendChild(headingBox);
    navGroup.appendChild(hiddenSubNav);

    // Listener to expand
    itemHeading.addEventListener("click", (e) => {
      e.preventDefault();
      let selectedItems = this._shadow.querySelectorAll('[selected="true"]')
      for(let el of selectedItems) {
        el.setAttribute("selected", "false");
      };
      
      this.toggleSubItemList({ "targetEl" : hiddenSubNav});
  
      return headingBox.setAttribute("selected", "true");
    });

    // SubItems
    if (subItems.length > 0){
      for(let obj of subItems){
        let itemIdSelector = `#itemDivId-${type}-${obj.id}`

        hiddenSubNav.appendChild( this.getSubItem(obj, type, itemIdSelector) );

        // If we don't allow New items, this object won't exist
        if(obj.id == "New"){    
          this.addSpan(headingBox, itemHeading, itemIdSelector);
        }
      }
    } else {
      console.log("No subitems for heading "+name);
      // Should not get here (just a heading - not link - with no subitems or ability to +Add new)
    }

    return this.nav.appendChild(navGroup);
  }

  // This is the the "+" next to item heading
  addSpan(headingBox, itemHeading, itemIdSelector){
    let addSpan = document.createElement("span");
    addSpan.setAttribute("class", "float-right Nav-action col-2 f1 text-bold clickable");
    let t = document.createTextNode(`+`); 
    addSpan.appendChild(t);
    headingBox.appendChild(addSpan);
    itemHeading.classList.add("col-10");
    itemHeading.classList.add("float-left");

    // ADD Links
    addSpan.addEventListener("click", (e) => {
      e.preventDefault();
  
      this._shadow.querySelectorAll('[selected="true"]').forEach( el => {
        el.setAttribute("selected", "false");
      });

      e.target.closest(".SideNav-heading").setAttribute("selected", "true");
      this.toggleItemContainer({ "itemIdSelector" : itemIdSelector });
    });
  }

  getSubItem(obj, type, itemIdSelector){
    /* obj requires ---> id, name */
    //
    let itemId = obj.id; // ie. video type with ID of 62
    let subNavLink = document.createElement("a");
    let subItemText = obj.name ? obj.name : obj.username;

    subNavLink.setAttribute("class", `SideNav-subItem ${(itemId == "New") ? "text-italic" : "" }`);
    subNavLink.style.paddingLeft = "44px";
    subNavLink.href = itemIdSelector;
    subNavLink.innerHTML = subItemText;

    // Sub Nav Links
    subNavLink.addEventListener("click", (e) => {
      e.preventDefault();

      this.makeNavItemsActive( e.target, type );
      this.toggleItemContainer({ "itemIdSelector" : itemIdSelector });
    });

    return subNavLink;
  }

  makeNavItemsActive( item, type ){
    let currentSelected = this._shadow.querySelectorAll('[selected="true"]')
    for(let el of currentSelected){
      el.setAttribute("selected", "false");
    }
    item.setAttribute("selected", "true");
    this._shadow.querySelector(`.heading-for-${type}`).setAttribute("selected", "true");
  }

  toggleItemContainer({ itemIdSelector = ``} = {}){
    let targetEl = this._shadow.querySelector( itemIdSelector );
    if(targetEl){
      // Hide all other item containers
      let currentSelected = this._shadow.querySelector('.item-box:not([hidden])');
      this.hide(currentSelected);
      return this.show( targetEl );
    } else {
      Utilities.warningAlert("Could not find selected nav item", "#ff3e1d", false);
    }
  };

  toggleSubItemList({ targetEl = ``} = {}){
    if(targetEl){
      if(!targetEl.hidden){
        this.hide(targetEl);
      } else {
        // Hide any  others that are open, and toggen this one.
        let subItems = this._shadow.querySelectorAll(".SubItems")
        for(let el of subItems) {
          this.hide(el);
        }
        return this.show( targetEl );
      }
    } else {
      Utilities.warningAlert("No sub items available", "#ff3e1d", false);
    }
  };

  addItemContainer({ id = -1, itemContents = "", type = "", hidden = true}){
    let itemDiv = document.createElement("div");
    itemDiv.id = `itemDivId-${type}-${id}`; //ie. #itemDivId-MediaType-72
    itemDiv.setAttribute("class", `item-box item-group-${id}`);
    itemDiv.hidden = hidden;

    if(itemContents != "") itemDiv.appendChild(itemContents);

    return this.itemsContainer.appendChild(itemDiv);
  }

  fillContainer({ id = -1, itemContents = document.createTextNode(""), type = ""}){
    let itemDivId = `#itemDivId-${type}-${id}`; //ie. #itemDivId-MediaType-72
    let itemDiv = this._shadow.querySelector(itemDivId);

    return itemDiv.appendChild(itemContents);
  }

  // Hide and show to centralize where we are doing this action
  hide(el){
    if(el.nodeType == Node.ELEMENT_NODE){
      return el.hidden = true;
    } else {
      let node = this._shadow.getElementById(el);
      return node.hidden = true;
    }
    
  }
  show(el){
    if(el.nodeType == Node.ELEMENT_NODE){
      return el.hidden = false;
    } else {
      let node = this._shadow.getElementById(el);
      return node.hidden = false;
    }
  }

}

customElements.define("settings-nav", SettingsNav);
