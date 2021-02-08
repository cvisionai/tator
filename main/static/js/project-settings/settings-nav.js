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
  }


  _addNav({name, type, subItems}){
    return this._addHeadingWithSubItems({
      name,
      type,
      subItems
    });
  }

  _addSimpleNav({name, type, id, selected}){
    return this._addItem({
      name,
      type,
      "linkData": `#itemDivId-${type}-${id}`,
      selected
    });
  }

  //
  _addItem({name = "Default", type = "project", linkData = "#", selected = false} = {} ){
    let item = document.createElement("a");
    item.setAttribute("class", "SideNav-item ");
    item.href = linkData;
    item.title = type.replace(/[^a-zA-Z0-9]+(.)/g, (m, chr) => chr.toUpperCase());
    if(selected) {
      item.setAttribute("selected", "true");
      this.toggleItem({ "itemIdSelector":linkData});
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
  _addHeadingWithSubItems({
    name = document.createElement(""), 
    type = "", 
    subItems = []
  } = {} ){
    let headingBox = document.createElement("div");
    let itemHeading = document.createElement("button");
    let hiddenSubNav = document.createElement("nav");
    let navGroup = document.createElement("div");

    navGroup.setAttribute("class", "SubNav")
    navGroup.appendChild(headingBox);
    navGroup.appendChild(hiddenSubNav);

    headingBox.setAttribute("class", `SideNav-heading f1 clearfix`); // ie. video,image,multi,localization,leaf,state

    // Heading button
    itemHeading.setAttribute("class", `toggle-subitems-${type}`); // ie. video,image,multi,localization,leaf,state
    itemHeading.appendChild(name);
    itemHeading.setAttribute("selected", "false");
    headingBox.appendChild(itemHeading);

    itemHeading.addEventListener("click", (event) => {
      event.preventDefault();
      this._shadow.querySelectorAll('[selected="true"]').forEach( el => {
        el.setAttribute("selected", "false");
      })
      
      this.toggleSubItemList({ "elClass" : `.subitems-${type}`});

      return event.target.closest(".SideNav-heading").setAttribute("selected", "true");
    });
    
    hiddenSubNav.setAttribute("class", `SideNav SubItems  subitems-${type}`);
    hiddenSubNav.hidden = true;

    // SubItems
    if (subItems.length > 0){
      for(let obj of subItems){
        let itemId = obj.id; // ie. video type with ID of 62
        let subNavLink = document.createElement("a");
        let subItemText = obj.name;

        subNavLink.setAttribute("class", `SideNav-subItem ${(itemId == "New") ? "text-italic" : "" }`);
        subNavLink.style.paddingLeft = "44px";

        let itemIdSelector = `#itemDivId-${type}-${itemId}`
        subNavLink.href = itemIdSelector;
        subNavLink.innerHTML = subItemText;

        hiddenSubNav.appendChild(subNavLink);

        let addSpan = document.createElement("span");
        // Add action if required'
        if(itemId == "New"){
          addSpan.setAttribute("class", "float-right Nav-action col-2 f1 text-bold clickable");
          let t = document.createTextNode(`+`); 
          addSpan.appendChild(t);
          headingBox.appendChild(addSpan);
          itemHeading.classList.add("col-10");
          itemHeading.classList.add("float-left");

          // ADD Links
          addSpan.addEventListener("click", (event) => {
            event.preventDefault();
        
            this._shadow.querySelectorAll('[selected="true"]').forEach( el => {
              el.setAttribute("selected", "false");
            });

            event.target.closest(".SideNav-heading").setAttribute("selected", "true");
        
            this.toggleItem({ "itemIdSelector" : itemIdSelector });
          });
        }

        // Sub Nav Links
        subNavLink.addEventListener("click", (event) => {
          event.preventDefault();
      
          this._shadow.querySelectorAll('[selected="true"]').forEach( el => {
            el.setAttribute("selected", "false");
          })
          event.target.setAttribute("selected", "true");
          event.target.parentNode.parentNode.querySelector('.SideNav-heading').setAttribute("selected", "true");
      
          console.log("id for toggle: "+itemIdSelector);
      
          this.toggleItem({ "itemIdSelector" : itemIdSelector });
        });
      }
    } else {
      console.log("No subitems for heading "+name);
    }

    return this.nav.appendChild(navGroup);
  }

  toggleItem({ itemIdSelector = ``} = {}){
    let targetEl = null;
    let dom = this._shadow;
      
    // Hide all other item boxes
    dom.querySelectorAll('.item-box').forEach( (el) => {
      el.hidden = true;
      
      // Find and show our target
      targetEl = dom.querySelector( itemIdSelector );
        if(targetEl) targetEl.hidden = false;
      } );
      return targetEl.hidden;
  };

  toggleSubItemList({ elClass = ``} = {}){
    // Hide any  others that are open, and toggen this one.
    this._shadow.querySelectorAll(".SubItems").forEach((item, i) => {
      item.hidden = true;
    });

    //console.log(elClass);
    let targetEl = this.nav.querySelector( elClass );
    targetEl.hidden = false;

    return  targetEl.hidden;
  };

  getMain(){
    return this.main;
  }

  getItemsContainer(){
    return this.itemsContainer;
  }

  addItemContainer({ id = -1, itemContents = "", type = "", hidden = true}){
    let itemDiv = document.createElement("div");
    itemDiv.id = `itemDivId-${type}-${id}`; //ie. #itemDivId-MediaType-72
    itemDiv.setAttribute("class", `item-box item-group-${id}`);
    itemDiv.hidden = hidden;

    if(itemContents != "") itemDiv.appendChild(itemContents);

    return this.itemsContainer.appendChild(itemDiv);
  }

  fillContainer({ id = -1, itemContents = document.createTextNode(""), type = ""}){
    console.log(id);
    let itemDivId = `#itemDivId-${type}-${id}`; //ie. #itemDivId-MediaType-72
    let itemDiv = this._shadow.querySelector(itemDivId);

    return itemDiv.appendChild(itemContents);
  }

  
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
