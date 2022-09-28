import { TatorElement } from "../../components/tator-element.js";
import { Utilities } from "../../util/utilities.js";
import Spinner from "../../../images/spinner-transparent.svg";
import { store } from "../store.js";

export class SettingsNav extends TatorElement {
  constructor() {
    super();

    // Main Div wrapper
    const template = document.getElementById("settings-nav").content;
    this._shadow.appendChild(template.cloneNode(true));

    // Handlers
    this.div = this._shadow.getElementById("settings-nav--div");
    this.nav = this._shadow.getElementById("settings-nav--nav");
   
  }




  // newItemEvent(typeId, typeName, newName){
  //   let detail = {
  //     "bubbles" : true,
  //     "detail" : {
  //       "typeId" : typeId,
  //       "typeName" : typeName,
  //       "newName" : newName
  //     }
  //   };
  //   return new CustomEvent('settings-nav-new', detail);
  // }

  // renameItemEvent(typeId, typeName, newName) {
  //   let detail = {
  //     "bubbles" : true,
  //     "detail" : {
  //       "typeId" : typeId,
  //       "typeName" : typeName,
  //       "newName" : newName
  //     }
  //   };
  //   return new CustomEvent('settings-nav-rename', detail);
  // }

  // removeItemEvent(typeId, typeName){
  //   let detail = {
  //     "bubbles" : true,
  //     "detail" : {
  //       "typeId" : typeId,
  //       "typeName" : typeName
  //     }
  //   };
  //   return new CustomEvent('settings-nav-remove', detail);
  // }

  // newNavItem(e){  
  //   // Create the link.
  //   let obj = {
  //     "id" : e.detail.typeId,
  //     "name" : e.detail.newName
  //   }
  //   let itemSelector = `#itemDivId-${e.detail.typeName}-${e.detail.typeId}`;
  //   let subNavLink = this.getSubItem(obj, e.detail.typeName, itemSelector);
    
  //   // Find the end of the type's section.
  //   let addNewNode = this._shadow.querySelector(`a[href='#itemDivId-${e.detail.typeName}-New']`);
  //   //let parentNode = addNewNode.parentNode;
  //   addNewNode.before(subNavLink);

  //   if (e.detail.typeName == "LeafType") {
  //     const subNavInnerLinkSelector = `#itemDivId-${e.detail.typeName}-${e.detail.typeId}_inner`;
  //     const leafIcon = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" width="20" height="20" viewBox="0 0 32 25" data-tags="site map,tree,map"><g transform="scale(0.03125 0.03125)"><path d="M767.104 862.88h-95.68c-17.6 0-31.904-14.24-31.904-31.872v-63.808c0-17.568 14.304-31.872 31.904-31.872h63.776v-159.488h-223.264v159.488h31.872c17.632 0 31.904 14.304 31.904 31.872v63.808c0 17.632-14.272 31.872-31.904 31.872h-95.68c-17.6 0-31.872-14.24-31.872-31.872v-63.808c0-17.568 14.272-31.872 31.872-31.872h31.936v-159.488h-223.296v159.488h63.776c17.632 0 31.904 14.304 31.904 31.872v63.808c0 17.632-14.272 31.872-31.904 31.872h-95.648c-17.632 0-31.904-14.24-31.904-31.872v-63.808c0-17.568 14.272-31.872 31.904-31.872v-159.488-31.872h255.168v-127.584h-95.68c-17.632 0-31.904-14.272-31.904-31.904l0-159.488c0-17.6 14.272-31.904 31.904-31.904h223.264c17.632 0 31.872 14.272 31.872 31.904v159.456c0 17.6-14.24 31.904-31.872 31.904h-95.68v127.584h255.168v31.872 159.488c17.6 0 31.904 14.304 31.904 31.872v63.808c-0.032 17.664-14.368 31.904-31.936 31.904zM224.896 767.2v63.808h95.648v-63.808h-95.648zM607.616 384.48v-159.488h-223.264v159.456h223.264zM448.128 767.2v63.808h95.68v-63.808h-95.68zM767.104 767.2h-95.68v63.808h95.68v-63.808z"/></g></svg>`;
  //     let subNavInnerLink = this.getSubItem(obj, e.detail.typeName, subNavInnerLinkSelector, leafIcon+" Add/Edit Leaves");
  //     addNewNode.before(subNavInnerLink);    
  //   }

  //   return subNavLink.click();
  // }

  // updateNavItem(e) {
  //   // console.log("Rename to......"+e.detail.newName);
  //   let navItem = this._shadow.querySelector(`a[href='#itemDivId-${e.detail.typeName}-${e.detail.typeId}']`);
  //   // console.log(navItem);
  //   return navItem.innerHTML = e.detail.newName;
  // }

  // deleteNavItem(e) {
  //   // Delete the side nav item, and container
  //   let navItem = this._shadow.querySelector(`a[href='#itemDivId-${e.detail.typeName}-${e.detail.typeId}']`);
  //   let container = this._shadow.getElementById(`itemDivId-${e.detail.typeName}-${e.detail.typeId}`);

  //   // Show something else...
  //   navItem.parentNode.querySelectorAll('a')[0].click();

  //   // remove the container and side nav link
  //   container.remove();
  //   navItem.remove()

  //   if (e.detail.typeName == "LeafType") {
  //     // Delete the CHILD side nav item, and container
  //     let navItem = this._shadow.querySelector(`a[href='#itemDivId-${e.detail.typeName}-${e.detail.typeId}_inner']`);
  //     let container = this._shadow.getElementById(`itemDivId-${e.detail.typeName}-${e.detail.typeId}_inner`);

  //     // remove the container and side nav link
  //     container.remove();
  //     navItem.remove()      
  //   }
  // }

  // _getItemDivId(typeName, typeId) {
  //   return `itemDivId-${typeName}-${typeId}`;
  // }

  _addNav({name, type, subItems, subItemsOnly = false, pendingSubItems=true, innerLinkText = ""}){
    if(subItemsOnly){
      return this._subItemsOnly({
        type,
        subItems,
        innerLinkText
      })
    } else {
      return this._addHeadingWithSubItems({
        name,
        type,
        subItems,
        pendingSubItems
      });
    }
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
    subItems = [],
    pendingSubItems = false
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
      headingBox.setAttribute("selected", "true");
    });

    // Use a spinner if we are waiting to get the subItem list
    if (pendingSubItems) {
      let spinnerImg = document.createElement('img');
      spinnerImg.src = Spinner;
      hiddenSubNav.appendChild(spinnerImg);
    }

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
      // console.log("No subitems for heading "+name);
      // Should not get here (just a heading - not link - with no subitems or ability to +Add new)
    }

    this.nav.appendChild(navGroup);
    
    return itemHeading;
  }

  // This adds subitems to an existing heading
  // @TODO no "New item" trigger can be added in this fn (requires more el access)
  _subItemsOnly({ subItems = [], type = "", innerLinkText = ""}) {
    let section = this._shadow.querySelector(`.subitems-${type}`);
    section.querySelector(`img`).hidden = true;

    // SubItems
    if (subItems && subItems.length > 0){
      for(let obj of subItems){
        let itemSelector = `#itemDivId-${type}-${obj.id}`
        let subNavLink = this.getSubItem(obj, type, itemSelector);

        let newSelector = `#itemDivId-${type}-New`;
        let addNewNode = this._shadow.querySelector(`a[href='${newSelector}']`);

        // Find the end of the type's section.
        if (addNewNode) {         
          addNewNode.before(subNavLink);
        } else {
          section.appendChild(subNavLink);
        }

        //
        if (innerLinkText !== "") {
          let innerSelector = `#itemDivId-${type}-${obj.id}_inner`
          let innerSubNavLink = this.getSubItem(obj, type, innerSelector, innerLinkText);
          subNavLink.after(innerSubNavLink);
        }

      }
    } else {
      // console.log("No subitems for heading "+name);
      // Should not get here (just a heading - not link - with no subitems or ability to +Add new)
    }

  }

  // This is the the "+" next to item heading
  addSpan(headingBox, itemHeading, itemIdSelector){
    let addSpan = document.createElement("span");
    addSpan.setAttribute("class", "float-right Nav-action col-2 f1 text-bold clickable "); //add-new__icon circle
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

  getSubItem(obj, type, itemIdSelector, innerLinkText = ""){
    /* obj requires ---> id, name */
    //
    let itemId = obj.id; // ie. video type with ID of 62
    let subNavLink = document.createElement("a");
    let subItemText = obj.name ? obj.name : (obj.username ? obj.username : obj.email);

    subNavLink.setAttribute("class", `SideNav-subItem ${(itemId == "New") ? "text-italic" : "" }`);
    
    subNavLink.href = itemIdSelector;
    subNavLink.innerHTML = innerLinkText !== "" ? innerLinkText : subItemText;

    if (innerLinkText !== "") {
      subNavLink.style.paddingTop = "0px";
      subNavLink.style.margin = "0 0 5px 44px";
    } else {
      subNavLink.style.paddingLeft = "44px";
    }

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
    let targetEl = this._shadow.querySelector(itemIdSelector);
    
    if(targetEl){
      // Hide all other item containers
      let currentSelected = this._shadow.querySelector('.item-box:not([hidden])');
      this.hide(currentSelected);
      window.history.pushState({}, '', itemIdSelector);
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

  addItemContainer({ id = -1, itemContents = "", type = "", hidden = true, innerLinkText = ""}){
    let itemDiv = document.createElement("div");
    itemDiv.id = `itemDivId-${type}-${id}`; //ie. #itemDivId-MediaType-72
    itemDiv.setAttribute("class", `item-box item-group-${id}`);
    itemDiv.hidden = hidden;

    if (itemContents != "") itemDiv.appendChild(itemContents);
    this.itemsContainer.appendChild(itemDiv);

    if (innerLinkText !== "") {
      let itemInnerDiv = document.createElement("div");
      itemInnerDiv.id = `itemDivId-${type}-${id}_inner`; //ie. #itemDivId-MediaType-72_inner
      itemInnerDiv.setAttribute("class", `item-box item-group-${id}_inner`);
      itemInnerDiv.hidden = true; //always hide on creation
      this.itemsContainer.appendChild(itemInnerDiv);
    }
  }

  fillContainer({ id = -1, itemContents = document.createTextNode(""), type = "", innerNav = false}){
    //console.log(`Filling ${type} container with id ${id}`);
    let itemDivId = `#itemDivId-${type}-${id}${innerNav ? "_inner" : ""}`; //ie. #itemDivId-MediaType-72
    let itemDiv = this._shadow.querySelector(itemDivId);
    
    // clear just in case
    itemDiv.innerHTML = "";

    return itemDiv.appendChild(itemContents);
  }



}

customElements.define("settings-nav", SettingsNav);
