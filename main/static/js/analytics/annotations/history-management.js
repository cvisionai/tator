// @TODO
// This is a future feature to all a filtered page view query in URL
// Needs more work and integration to allow pressing back & bookmark with accuracy
// This could be made a component if filter string & pagination states are used in future galleries

class FilterHistoryManagement {
    constructor(){

    }
    // Handle push state, will not remake query param if no change in pagination or filter
  // uses passed states instead of reading in case there are changes
  _handlePushState({ fp = null, ps = null} = {}){
    const state = { 'page_id': this.projectId }
    const title = ''
    const urlBase = window.location.pathname;
    let pq = "";
    let fq = "";

    // Get pagination info for URL
    if(ps != null) {
      pq = `pst=${ps.start}&pstp=${ps.stop}&p=${ps.page}&psz=${ps.pageSize}`;
    }

     // Get filter info for URL
    if(fp != null) {
      let fpEncoded = encodeURI();
      fq =`fc=${fpEncoded}`;
    }

    const URL = `${urlBase}?${pq}${fq != null ? "&" : ""}${fq} `;

    if(pq || fq) return history.pushState(state, title, URL);
  }

  // @TODO start of integrating query params into pages
  _readQueryParams(){
    let thereWereFixes = false;
    // Reads Query params and updates the default states before card gallery is drawn
    const queryString = window.location.search;
    const urlParams = new URLSearchParams(queryString);

    //Update filter with query params
    if(urlParams.get("fc")) {
      const decodedFc = decodeURI( urlParams.get("fc") );
      this._filterParams = decodedFc;
      console.log(fc);
      console.log(decodedFc);
    } 

    // Update pagination state from query params
    // Only if we minimally have either a page, or a start & stop
    if(urlParams.get("p") || (urlParams.get("pst") && urlParams.get("pstp"))){
      
      // Set start and stop
      if(urlParams.get("pst")) this._paginationState.start = urlParams.get("pst");
      if(urlParams.get("pstp")) this._paginationState.stop = urlParams.get("pstp");      
      
      // Page size (with conditions for != start stop, or page #)
      if(urlParams.get("psz")) {
        if( urlParams.get("pst") && urlParams.get("pstp") ) {
          let paramSize = Number(urlParams.get("psz"));
          let paramStart = Number(urlParams.get("pst"));
          let paramStop = Number(urlParams.get("pstp"));
          let startStopRange = (paramStop - paramStart);

          if( startStopRange !== paramSize) {
            if( (startStopRange == 10) || (startStopRange == 25) || (startStopRange == 50)){
              // if it on track with our page size options this use instead of passed pagesz
              this._paginationState.pageSize = startStopRange;
              let page = startStopRange / paramStart;
              if( page !== this._paginationState.page ){
                this._paginationState.page = page;
                thereWereFixes = true;
              }
            } else { // If stop & start don't make sense ignore them 
              // Means the start and stop match pgsize... reset them to match, use pgSize as truth
              // @TODO
              // find start & stop using pageSize and page
            }
            
          }
          }
        } else {
          // Means the start and stop match pgsize...
          // Double check the page value & set the size as it is passed
          this._paginationState.pageSize = urlParams.get("psz");
        }

        // Use start and top to double check page selected
        // let pageCalc = this._paginationState.stop / this._paginationState.start;
        // if( pageCalc !== this._paginationState.page ){
        //   this._paginationState.page = page;
        // }
      
    }

    if(thereWereFixes){
      // Pushes path + new Query param to history so user can press back
      //this._handlePushState({ fp : this._filterParams, ps : this._paginationState});
    }

  }
}

