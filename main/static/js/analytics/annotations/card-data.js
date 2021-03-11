class CardData {
    /* projectId : projectId, modelData : this._modelData */
    constructor({ 
        projectId = null,
        modelData = null, 
        localizationTypes = []
      }){
          this.projectId = projectId;
          this._modelData = modelData;
          this.localizationTypes = localizationTypes;
    }

    async makeCardList({ filterState, paginationState } = {}){
        this.cardList = {};
        this.cardList.cards = [];
        this.cardList.filterState = filterState;
        this.cardList.paginationState = paginationState;
        this.cardList.total = await this._modelData.getLocalizationCount({params : filterState.params});

        this.localizations= await this._modelData.getLocalizations({
            params : filterState.params, 
            start : paginationState._start, 
            stop : paginationState._stop
        });
        await this.getCardList(this.localizations);
        return this.cardList;
    }

    getCardList(localizations){
        return new Promise((resolve, reject) => {

            let counter = localizations.length;
            for(let [i, l] of localizations.entries()){
                let id = l.id;
                
                //let metaDetails = this.findMetaDetails( l.meta );
                let metaDetails = {name : "sample name", type : "sample type"};

                let mediaLink = `/${this.projectId}/annotation/${l.media}`;
            
                let attributes = l.attributes;
                let created = new Date(l.created_datetime);
                let modified = new Date(l.modified_datetime);

                let position = i + this.cardList.paginationState._start;
                let posText = `${position} of ${this.cardList.total}`;

                let promises = [ 
                        this._modelData.getUser(l.modified_by),
                        this._modelData.getLocalizationGraphic(l.id)
                    ]
                
                Promise.all(promises)
                .then((respArray) => {
                    let userName = respArray[0].username;
                    let graphic = respArray[1];
            
                    let card = {
                        id,
                        metaDetails,
                        mediaLink,
                        graphic,
                        attributes,
                        created,
                        modified,
                        userName,
                        posText
                    };
                    //console.log(card);
                    this.cardList.cards.push(card);
                    counter --;
                    //console.log("counter went down is now: "+counter); 
                });
                
            }
            let counterCheckout = setInterval(function(){
                //console.log("interval check for counter "+counter); 
                if(counter == 0){
                    clearInterval(counterCheckout);
                    resolve("complete");
                }
                }, 500)
        });
    }

    getCardListFaster(localizations){
        //return new Promise((resolve, reject) => {

            let counter = localizations.length;
            for(let [i, l] of localizations.entries()){
                let id = l.id;
                
                //let metaDetails = this.findMetaDetails( l.meta );
                let metaDetails = {name : "sample name", type : "sample type"};

                let mediaLink = document.createElement("a");
                mediaLink.setAttribute("href", `/${this.projectId}/annotation/${l.media}`)
                mediaLink.innerHTML = `Media ID ${l.media}`;
            
                let attributes = l.attributes;
                let created = new Date(l.created_datetime);
                let modified = new Date(l.modified_datetime);

                let position = i + this.cardList.paginationState._start;
                let posText = `${position} of ${this.cardList.total}`;

                let promises = [ 
                        this._modelData.getUser(l.modified_by),
                        this._modelData.getLocalizationGraphic(l.id)
                    ]
                
                // Promise.all(promises)
                // .then((respArray) => {
                //     let userName = respArray[0].username;
                //     let graphic = respArray[1];
            
                    let card = {
                        id,
                        metaDetails,
                        mediaLink,
                        graphic : this._modelData.getLocalizationGraphic(l.id),
                        attributes,
                        created,
                        modified,
                        userName : this._modelData.getUser(l.modified_by),
                        posText
                    };
                    //console.log(card);
                    this.cardList.cards.push(card);
                    //counter --;
                    //console.log("counter went down is now: "+counter); 
                // });
                
            }

            // let counterCheckout = setInterval(function(){
            //     //console.log("interval check for counter "+counter); 
            //     if(counter == 0){
            //         clearInterval(counterCheckout);
            //         resolve("complete");
            //     }
            //     }, 100)

            return this.cardList;
        //});
    }

    findMetaDetails(id){
        for(let lt of this.localizationTypes){
            if(lt.id == id){
                return { name: lt.name, type: lt.dtype };
            }
        }
    }
}