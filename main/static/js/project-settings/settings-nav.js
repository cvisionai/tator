class SettingsNav extends TatorElement {
  constructor() {
    super();
    //@TODO - this could be abstract component
    // main structure
    this.nav = document.createElement("nav");
    this.nav.setAttribute("class", "SideNav rounded-2 col-3");
    this.nav.style.float = "left";
    this._shadow.appendChild(this.nav);
  }


  _addNav({name, type, subItems}){
    if(subItems.length > 0){
      return this._addHeadingWithSubItems({
        name,
        type,
        subItems
      });
    } else {
      // No data
      console.log(`${type} has no items.`);
    }

  }

  _addSimpleNav({name, type, hash, selected}){
    return this._addItem({
      name,
      type,
      "linkData": hash,
      selected
    });
  }

  //
  _addItem({name = "Default", type = "project", mediaId = -1, linkData = "#", selected = false} = {} ){
    //let item = document.createElement("h3");
    //item.setAttribute("class", "py-3 lh-condensed text-semibold");
    let item = document.createElement("a");
    item.setAttribute("class", "SideNav-item ");
    item.href = linkData;
    item.title = type.replace(/[^a-zA-Z0-9]+(.)/g, (m, chr) => chr.toUpperCase());
    if(selected) {
      item.setAttribute("selected", "true");
    } else {
      item.setAttribute("selected", "false");
    }

    item.innerHTML = name;

    item.addEventListener("click", (event) => {
      event.preventDefault();

      this._shadow.querySelectorAll('[selected="true"]').forEach( el => {
        el.setAttribute("selected", "false");
      })
      event.target.setAttribute("selected", "true");

      this.toggleItem({ "itemIdSelector":linkData});
    });

    return this.nav.appendChild(item);
  }

// Creates a clickable heading that expands to show clickable subitem lisr
_addHeadingWithSubItems({name = "Default", type = "project", subItems = [], itemDivId = -1, linkData = "#"} = {} ){
  let itemHeading = document.createElement("button");
  let hiddenSubNav = document.createElement("nav");
  let navGroup = document.createElement("div");

  navGroup.setAttribute("class", "SubNav")
  navGroup.appendChild(itemHeading);
  navGroup.appendChild(hiddenSubNav);

  // Heading button
  itemHeading.setAttribute("class", `h5 SideNav-heading toggle-subitems-${type}`); // ie. video,image,multi,localization,leaf,state
  itemHeading.innerHTML = name; // ie. "${icon} Media Type"
  itemHeading.setAttribute("selected", "false");

  // SubItems
  if (subItems.length > 0){
    hiddenSubNav.setAttribute("class", `SideNav subitems-${type}`);
    hiddenSubNav.hidden = true;
    for(let obj of subItems){
      let itemId = obj.id; // ie. video type with ID of 62
      let subNavLink = document.createElement("a");
      let subItemText = obj.name;

      subNavLink.setAttribute("class", "SideNav-subItem");
      subNavLink.style.paddingLeft = "44px";

      let itemIdSelector = `#itemDivId-${type}-${itemId}`
      subNavLink.href = itemIdSelector;
      subNavLink.innerHTML = subItemText;

      hiddenSubNav.appendChild(subNavLink);

      // Sub Nav Links
      subNavLink.addEventListener("click", (event) => {
        event.preventDefault();

        this._shadow.querySelectorAll('[selected="true"]').forEach( el => {
          el.setAttribute("selected", "false");
        })
        event.target.setAttribute("selected", "true");
        event.target.parentNode.parentNode.querySelector('button').setAttribute("selected", "true");

        console.log("id for toggle: "+itemIdSelector);

        // @TODO could use type to find dom from array (make array assoc.)
        this.toggleItem({ "itemIdSelector" : itemIdSelector });
      });

    }
  } else {
    console.log("No subitems for heading "+name);
  }

  this.nav.appendChild(navGroup);

  // Heading toggle links
  return this.nav.querySelector(`.toggle-subitems-${type}`).addEventListener(
    "click", (event) => {
      event.preventDefault();

      this._shadow.querySelectorAll('[selected="true"]').forEach( el => {
        el.setAttribute("selected", "false");
      })


      let currentHide = this.toggleSubItemList({ "elClass" : `.subitems-${type}`});
      event.target.setAttribute("selected", currentHide);
    }
  );

}

  toggleItem({ itemIdSelector = ``} = {}){
    let targetEl = null;
    let typeDomArray = this._getDomArray();

    for(let dom of typeDomArray){
      // Hide all other item boxes
      dom.querySelectorAll('.item-box').forEach( (el) => {
        //if(!dom.querySelector(".changed")){
          el.hidden = true;
          // Find and show our target
          targetEl = dom.querySelector( itemIdSelector );
          if(targetEl) targetEl.hidden = false;
        //} else {
        //  this.boxHelper._modalError("You have unsaved changes", "Please save or discard changes to "+dom.querySelector(".changed h2"));
        //}
      } );
    }
  };

  toggleSubItemList({ elClass = ``} = {}){
    //console.log(elClass);
    let targetEl = this.nav.querySelector( elClass );
    let targetElHidden = targetEl.hidden;

    targetEl.hidden = !targetElHidden

    return targetElHidden;
  };

  
  /* @TODO - If the item's name is updated in the form, update it here too */
  // ie. listen for {}, and run ~renameNavItem()~ ...........
  /******/


  _setDomArray(array){
    this.domArray = array;
  }

  _getDomArray(){
    return this.domArray;
  }

}

customElements.define("settings-nav", SettingsNav);
